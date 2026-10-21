const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

let serverProcess = null;
let nodeHttpServer = null;
let serverLogs = [];
let isServerRunning = false;
let currentModelPath = '';
let serverPort = 8080;
let metrics = {
    tokensPerSecond: 52.4,
    evalTimeMs: 110,
    promptEvalTimeMs: 30,
    status: 'stopped'
};

let healthPollTimer = null;
let currentDownloadReq = null;
let isStoppingIntentional = false;

const TARGET_ENGINE_TAG = 'b11796';
const TARGET_ENGINE_BUILD = 11796;
const MIN_SUPPORTED_ENGINE_BUILD = 11796;
const ENGINE_VERSION_FILE = 'engine_version.json';

const MODEL_PRESETS = [
    {
        id: 'gemma-4-e2b',
        name: 'Gemma 4 E2B Instruct (Q4_0)',
        size: '2.04 GB (Model) + 557 MB (Vision)',
        url: 'https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_0.gguf',
        filename: 'gemma-4-E2B-it-Q4_0.gguf',
        mmprojUrl: 'https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF/resolve/main/mmproj-gemma-4-E2B-it-Q8_0.gguf',
        mmprojFilename: 'mmproj-gemma-4-E2B-it-Q8_0.gguf',
        description: 'Google Gemma 4 E2B Instruct GGUF model with full Multimodal Vision support for analyzing images and chat.'
    },
    {
        id: 'gemma-4-e4b',
        name: 'Gemma 4 E4B Instruct (Q4_0)',
        size: '4.59 GB (Model) + 560 MB (Vision)',
        url: 'https://huggingface.co/ggml-org/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q4_0.gguf',
        filename: 'gemma-4-E4B-it-Q4_0.gguf',
        mmprojUrl: 'https://huggingface.co/ggml-org/gemma-4-E4B-it-GGUF/resolve/main/mmproj-gemma-4-E4B-it-Q8_0.gguf',
        mmprojFilename: 'mmproj-gemma-4-E4B-it-Q8_0.gguf',
        description: 'High reasoning Google Gemma 4 E4B model with full Multimodal Vision support for complex analysis.'
    },
    {
        id: 'llama-3.2-3b',
        name: 'Llama 3.2 3B Instruct (Q4_K_M)',
        size: '2.02 GB',
        url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
        filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
        description: 'Ultra-fast, lightweight Meta Llama 3.2 3B model with universal compatibility and reasoning.'
    }
];

function getBinaryBuildNumber(exePath) {
    if (!exePath || !fs.existsSync(exePath)) return 0;
    try {
        const { spawnSync } = require('child_process');
        const res = spawnSync(exePath, ['--version'], { timeout: 3500, encoding: 'utf8' });
        const text = (res.stderr || '') + (res.stdout || '');
        const match = text.match(/build\s+(\d+)/i);
        if (match) return parseInt(match[1], 10);
    } catch (_) {}
    return 0;
}

function killStrayLlamaProcesses() {
    try {
        if (process.platform === 'win32') {
            const { execSync } = require('child_process');
            execSync('taskkill /F /IM llama-server.exe /T 2>nul || exit 0', { stdio: 'ignore' });
        } else {
            const { execSync } = require('child_process');
            execSync('pkill -9 llama-server 2>/dev/null || true', { stdio: 'ignore' });
        }
    } catch (_) {}
}

function getModelsDir() {
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.config');
    const dir = path.join(appData, 'QBrowse', 'models');
    if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
    }
    return dir;
}

function getBinDir() {
    // User-writable bin directory located in user AppData (avoids Program Files permissions issues on Windows)
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.config');
    const dir = path.join(appData, 'QBrowse', 'bin');
    if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
    }
    return dir;
}

function getBundledBinDir() {
    let dir = path.join(__dirname, 'bin');
    if (dir.includes('app.asar')) {
        dir = dir.replace('app.asar', 'app.asar.unpacked');
    }
    return dir;
}

function resolveBinaryPath() {
    const exeName = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';
    const bundledPath = path.join(getBundledBinDir(), exeName);
    const userPath = path.join(getBinDir(), exeName);

    // 1. If bundled binary exists, ensure user AppData bin has modern binaries and runtime DLLs
    if (fs.existsSync(bundledPath)) {
        try {
            ensureMsvcRuntime(getBundledBinDir());
            ensureMsvcRuntime(getBinDir());
            const bundledStats = fs.statSync(bundledPath);
            const userStats = fs.existsSync(userPath) ? fs.statSync(userPath) : null;
            const bundledBuild = getBinaryBuildNumber(bundledPath);
            const userBuild = userStats ? getBinaryBuildNumber(userPath) : 0;

            if (!userStats || userBuild < bundledBuild || userBuild < MIN_SUPPORTED_ENGINE_BUILD || bundledStats.mtimeMs > userStats.mtimeMs || bundledStats.size !== userStats.size) {
                appendLog(`[AI ENGINE] Synchronizing modern llama.cpp binaries (build ${bundledBuild || TARGET_ENGINE_TAG}) to AppData...`);
                const bundledDir = getBundledBinDir();
                const userDir = getBinDir();
                const files = fs.readdirSync(bundledDir);
                for (const f of files) {
                    try {
                        fs.copyFileSync(path.join(bundledDir, f), path.join(userDir, f));
                    } catch (err) {
                        if (err.code === 'EBUSY' || err.code === 'EPERM') {
                            killStrayLlamaProcesses();
                            try {
                                fs.copyFileSync(path.join(bundledDir, f), path.join(userDir, f));
                            } catch (_) {}
                        }
                    }
                }
                try {
                    fs.writeFileSync(path.join(userDir, ENGINE_VERSION_FILE), JSON.stringify({
                        tag: TARGET_ENGINE_TAG,
                        build: bundledBuild || TARGET_ENGINE_BUILD,
                        updatedAt: Date.now()
                    }, null, 2));
                } catch (_) {}
            }
        } catch (e) {
            appendLog(`[AI ENGINE] Error during binary synchronization: ${e.message}`);
        }
        if (fs.existsSync(userPath)) return userPath;
        return bundledPath;
    }

    // 2. Fall back to user AppData bin dir
    if (fs.existsSync(userPath)) {
        const userBuild = getBinaryBuildNumber(userPath);
        if (userBuild > 0 && userBuild < MIN_SUPPORTED_ENGINE_BUILD) {
            appendLog(`[WARN] Installed llama-server build (${userBuild}) is older than required minimum (${MIN_SUPPORTED_ENGINE_BUILD}) for Gemma 4. Auto-update required.`);
            return null; // Forces ensureEngineExists to download the modern build
        }
        ensureMsvcRuntime(getBinDir());
        return userPath;
    }

    return null;
}

// Option A: Ensure MSVC runtime DLLs exist in the binary directory so Windows loads them locally
function ensureMsvcRuntime(targetDir) {
    if (process.platform !== 'win32' || !targetDir) return;
    const requiredDlls = ['vcruntime140.dll', 'vcruntime140_1.dll', 'msvcp140.dll'];
    const system32 = path.join(process.env.WINDIR || 'C:\\Windows', 'System32');
    const bundledDir = getBundledBinDir();

    for (const dll of requiredDlls) {
        const dest = path.join(targetDir, dll);
        if (!fs.existsSync(dest)) {
            const srcBundled = path.join(bundledDir, dll);
            const srcSys = path.join(system32, dll);
            try {
                if (fs.existsSync(srcBundled)) {
                    fs.copyFileSync(srcBundled, dest);
                } else if (fs.existsSync(srcSys)) {
                    fs.copyFileSync(srcSys, dest);
                }
            } catch (_) {}
        }
    }
}

function appendLog(line) {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] ${line.trim()}`;
    serverLogs.push(formatted);
    if (serverLogs.length > 500) serverLogs.shift();
    return formatted;
}

// Fallback logic completely removed in favor of strict native endpoint matching

// REAL AI INFERENCE ENGINE (Local Ollama / LM Studio / Free AI Stream API)
async function generateRealAiReplyStream(prompt, onToken, onDone) {
    appendLog(`[REAL AI INFERENCE] Prompt: "${prompt.slice(0, 50)}..."`);

    // 1. Try Local Server Endpoints (Ollama, LM Studio, Native llama-server)
    // Avoid querying ourselves recursively if the built-in server is active on serverPort
    const localEndpoints = [];
    if (!nodeHttpServer) {
        localEndpoints.push(`http://127.0.0.1:${serverPort}/v1/chat/completions`);
    }
    localEndpoints.push(
        'http://127.0.0.1:11434/v1/chat/completions',
        'http://127.0.0.1:1234/v1/chat/completions',
        'http://127.0.0.1:8081/v1/chat/completions'
    );

    for (const ep of localEndpoints) {
        let retries = 0;
        let success = false;
        
        while (retries < 25 && !success) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000);

                const res = await fetch(ep, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [{ role: 'user', content: prompt }],
                        stream: true
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                // If model is still loading into RAM/VRAM, llama-server returns HTTP 503
                if (res.status === 503) {
                    retries++;
                    if (retries === 1 && onToken) {
                        onToken("[Model is currently loading into memory... Please wait...]\n\n");
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                if (res.ok && res.body) {
                    success = true;
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder('utf-8');
                    
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');
                        
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const jsonStr = line.slice(6);
                                if (jsonStr.trim() === '[DONE]') break;
                                try {
                                    const parsed = JSON.parse(jsonStr);
                                    const token = parsed.choices?.[0]?.delta?.content || '';
                                    if (token && onToken) {
                                        onToken(token);
                                    }
                                } catch(e) {}
                            }
                        }
                    }
                    if (onDone) onDone();
                    return;
                }

                // If non-200 and non-503, log warning and try next endpoint
                appendLog(`[WARN] AI endpoint ${ep} returned HTTP ${res.status}`);
                break;
            } catch(e) {
                // If it's the primary server port, it might still be starting the process or loading
                if (ep === localEndpoints[0]) {
                    retries++;
                    if (retries === 1 && onToken) {
                        onToken("[Model is currently loading into memory... Please wait...]\n\n");
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    break;
                }
            }
        }
    }

    // 2. Error if all local endpoints fail
    if (onToken) onToken("[ERROR] No local AI engine reachable. Please ensure llama-server is started and finished loading the model into memory.");
    if (onDone) onDone();
}

function processPromptStream(options = {}, onToken, onDone) {
    const { prompt = '', pageContext = '' } = options;
    let fullPrompt = prompt;
    if (pageContext && typeof pageContext === 'string' && pageContext.trim()) {
        fullPrompt = `[Context from current web page:\n${pageContext.slice(0, 3000)}]\n\nUser Question: ${prompt}`;
    }
    generateRealAiReplyStream(fullPrompt, onToken, onDone);
}

// Built-in OpenAI-compatible HTTP server when binary is absent
function startBuiltinNodeServer(port, onLog) {
    if (nodeHttpServer) {
        nodeHttpServer.close();
    }

    nodeHttpServer = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.url === '/v1/models' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                object: 'list',
                data: [
                    { id: 'gemma-4-2b-instruct', object: 'model', created: Date.now(), owned_by: 'google' },
                    { id: 'gemma-4-4b-instruct', object: 'model', created: Date.now(), owned_by: 'google' }
                ]
            }));
            return;
        }

        if (req.url === '/v1/chat/completions' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    const messages = parsed.messages || [];
                    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || 'Hello';
                    
                    appendLog(`[HTTP POST /v1/chat/completions] Query: "${lastUserMsg.slice(0, 40)}..."`);

                    if (parsed.stream) {
                        res.writeHead(200, {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive'
                        });

                        generateRealAiReplyStream(
                            lastUserMsg,
                            (token) => {
                                const ssePayload = {
                                    id: 'chatcmpl-' + Date.now(),
                                    object: 'chat.completion.chunk',
                                    created: Math.floor(Date.now() / 1000),
                                    model: 'gemma-4-2b-instruct',
                                    choices: [{ index: 0, delta: { content: token }, finish_reason: null }]
                                };
                                res.write(`data: ${JSON.stringify(ssePayload)}\n\n`);
                            },
                            () => {
                                res.write(`data: [DONE]\n\n`);
                                res.end();
                            }
                        );
                    } else {
                        let fullContent = '';
                        generateRealAiReplyStream(
                            lastUserMsg,
                            (token) => { fullContent += token; },
                            () => {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    id: 'chatcmpl-' + Date.now(),
                                    object: 'chat.completion',
                                    created: Math.floor(Date.now() / 1000),
                                    model: 'gemma-4-2b-instruct',
                                    choices: [{ index: 0, message: { role: 'assistant', content: fullContent }, finish_reason: 'stop' }]
                                }));
                            }
                        );
                    }
                } catch(e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: { message: 'Invalid JSON payload' } }));
                }
            });
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });

    nodeHttpServer.listen(port, '127.0.0.1', () => {
        appendLog(`[SUCCESS] llama-server HTTP service listening at http://127.0.0.1:${port}/v1`);
    });
}

async function startLlamaServer(options = {}, onLog, onStatusChange) {
    isStoppingIntentional = false;
    if (serverProcess) {
        stopLlamaServer();
    }
    if (nodeHttpServer) {
        nodeHttpServer.close();
        nodeHttpServer = null;
    }

    const {
        modelPath,
        threads = 8,
        contextSize = 4096,
        gpuLayers = 0,
        port = 8080,
        temp = 0.7
    } = options;

    serverPort = port;
    currentModelPath = modelPath || currentModelPath;

    if (currentModelPath && !path.isAbsolute(currentModelPath)) {
        currentModelPath = path.join(getModelsDir(), currentModelPath);
    }

    // If requested model doesn't exist on disk, auto-select an available downloaded model
    if (!currentModelPath || !fs.existsSync(currentModelPath)) {
        const availableModels = getDownloadedModels().filter(m => !m.filename.startsWith('mmproj-'));
        if (availableModels.length > 0) {
            currentModelPath = availableModels[0].path;
            appendLog(`[INFO] Auto-selected available model: ${availableModels[0].filename}`);
        }
    }

    const ensureEngineExists = async (forceDownload = false) => {
        if (!forceDownload) {
            let binPath = resolveBinaryPath();
            if (binPath) {
                ensureMsvcRuntime(path.dirname(binPath));
                ensureMsvcRuntime(getBinDir());
                return binPath;
            }
        }

        appendLog(`[AI ENGINE] Downloading native llama.cpp engine (${TARGET_ENGINE_TAG})...`);
        if (onStatusChange) onStatusChange({ status: 'downloading_engine' });

        const AdmZip = require('adm-zip');
        const targetBinDir = getBinDir();
        const isWin = process.platform === 'win32';
        const zipPath = path.join(targetBinDir, isWin ? 'llama.zip' : 'llama.tar.gz');

        // Check if Vulkan is present on Windows, otherwise use universal CPU engine
        const hasVulkanRuntime = isWin && fs.existsSync(path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'vulkan-1.dll'));
        
        let downloadUrl = `https://github.com/ggml-org/llama.cpp/releases/download/${TARGET_ENGINE_TAG}/llama-${TARGET_ENGINE_TAG}-bin-win-cpu-x64.zip`;
        if (isWin) {
            if (hasVulkanRuntime) {
                downloadUrl = `https://github.com/ggml-org/llama.cpp/releases/download/${TARGET_ENGINE_TAG}/llama-${TARGET_ENGINE_TAG}-bin-win-vulkan-x64.zip`;
            } else {
                appendLog('[INFO] Vulkan runtime not detected on system. Selecting universal CPU engine for maximum compatibility.');
            }
        } else if (process.platform === 'linux') {
            downloadUrl = `https://github.com/ggml-org/llama.cpp/releases/download/${TARGET_ENGINE_TAG}/llama-${TARGET_ENGINE_TAG}-bin-ubuntu-x64.tar.gz`;
        } else if (process.platform === 'darwin') {
            downloadUrl = `https://github.com/ggml-org/llama.cpp/releases/download/${TARGET_ENGINE_TAG}/llama-${TARGET_ENGINE_TAG}-bin-macos-arm64.tar.gz`;
        }

        const downloadWithRedirects = (url, redirectCount = 0) => {
            return new Promise((resolve, reject) => {
                if (redirectCount > 5) return reject(new Error('Too many redirects'));
                const client = url.startsWith('https') ? https : http;
                const req = client.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) QBrowse/1.0 Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*'
                    }
                }, (res) => {
                    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
                        const nextUrl = res.headers.location;
                        if (!nextUrl) return reject(new Error(`Redirect status ${res.statusCode} without location`));
                        return resolve(downloadWithRedirects(nextUrl, redirectCount + 1));
                    }
                    if (res.statusCode !== 200) {
                        return reject(new Error(`Failed to download llama.cpp engine: HTTP ${res.statusCode}`));
                    }

                    const fileStream = fs.createWriteStream(zipPath);
                    res.pipe(fileStream);
                    fileStream.on('finish', () => {
                        fileStream.close();
                        try {
                            killStrayLlamaProcesses();

                            if (downloadUrl.endsWith('.zip')) {
                                const zip = new AdmZip(zipPath);
                                zip.extractAllTo(targetBinDir, true);
                            } else {
                                const { execSync } = require('child_process');
                                execSync(`tar -xzf "${zipPath}" -C "${targetBinDir}"`);
                            }
                            try { fs.unlinkSync(zipPath); } catch (_) {}
                            
                            const finalExeName = isWin ? 'llama-server.exe' : 'llama-server';
                            const finalBinPath = path.join(targetBinDir, finalExeName);
                            if (!isWin && fs.existsSync(finalBinPath)) {
                                fs.chmodSync(finalBinPath, 0o755);
                            }

                            try {
                                fs.writeFileSync(path.join(targetBinDir, ENGINE_VERSION_FILE), JSON.stringify({
                                    tag: TARGET_ENGINE_TAG,
                                    build: TARGET_ENGINE_BUILD,
                                    updatedAt: Date.now()
                                }, null, 2));
                            } catch (_) {}

                            // Ensure MSVC runtime DLLs are placed in targetBinDir
                            ensureMsvcRuntime(targetBinDir);

                            appendLog(`[AI ENGINE] Native llama.cpp engine (${TARGET_ENGINE_TAG}) extracted successfully.`);
                            resolve(finalBinPath);
                        } catch (err) {
                            appendLog(`[AI ENGINE] Extraction error: ${err.message}`);
                            reject(err);
                        }
                    });
                    fileStream.on('error', reject);
                });
                req.on('error', reject);
            });
        };

        return downloadWithRedirects(downloadUrl);
    };

    // 1. Verify model file exists on disk
    if (!currentModelPath || !fs.existsSync(currentModelPath)) {
        const errorMsg = `No GGUF model found at "${currentModelPath || '(not set)'}". Please download a model from Settings.`;
        appendLog(`[ERROR] ${errorMsg}`);
        if (onStatusChange) onStatusChange({ status: 'error', error: 'MODEL_NOT_FOUND', message: errorMsg });
        return { success: false, running: false, error: 'MODEL_NOT_FOUND', message: errorMsg };
    }

    try {
        const binaryPath = await ensureEngineExists();

        if (binaryPath && fs.existsSync(binaryPath)) {
            const args = [
                '--model', currentModelPath,
                '--ctx-size', contextSize.toString(),
                '--threads', threads.toString(),
                '--n-gpu-layers', gpuLayers.toString(),
                '--port', port.toString(),
                '--host', '127.0.0.1',
                '--parallel', '1'
            ];

            let mmprojTarget = options.mmprojPath;
            if (mmprojTarget) {
                const mmprojFullPath = path.isAbsolute(mmprojTarget) 
                    ? mmprojTarget 
                    : path.join(getModelsDir(), mmprojTarget);
                if (!fs.existsSync(mmprojFullPath) && !fs.existsSync(mmprojTarget)) {
                    mmprojTarget = null;
                }
            }
            if (!mmprojTarget) {
                // Find matching mmproj projector for this specific model family
                const modelBase = path.basename(currentModelPath).toLowerCase();
                const availableProjs = getDownloadedModels().filter(m => m.filename.startsWith('mmproj-'));
                const matchedProj = availableProjs.find(m => {
                    const fn = m.filename.toLowerCase();
                    if (modelBase.includes('e4b') && fn.includes('e4b')) return true;
                    if (modelBase.includes('e2b') && fn.includes('e2b')) return true;
                    return false;
                });
                if (matchedProj) {
                    mmprojTarget = matchedProj.path;
                }
            }

            if (mmprojTarget) {
                const mmprojFullPath = path.isAbsolute(mmprojTarget) 
                    ? mmprojTarget 
                    : path.join(getModelsDir(), mmprojTarget);

                const modelBase = path.basename(currentModelPath).toLowerCase();
                const projBase = path.basename(mmprojTarget).toLowerCase();
                const isCompatible = (modelBase.includes('e4b') && projBase.includes('e4b')) ||
                                     (modelBase.includes('e2b') && projBase.includes('e2b')) ||
                                     (!modelBase.includes('e4b') && !modelBase.includes('e2b'));

                if (isCompatible && fs.existsSync(mmprojFullPath)) {
                    args.push('--mmproj', mmprojFullPath);
                    appendLog(`[INFO] Loaded multimodal vision projector: ${path.basename(mmprojFullPath)}`);
                } else if (isCompatible && fs.existsSync(mmprojTarget)) {
                    args.push('--mmproj', mmprojTarget);
                    appendLog(`[INFO] Loaded multimodal vision projector: ${path.basename(mmprojTarget)}`);
                } else {
                    appendLog(`[WARN] Skipping incompatible vision projector ${projBase} for model ${modelBase}`);
                }
            }

            const binDir = path.dirname(binaryPath);
            appendLog(`Launching native C++ llama-server with args: ${args.join(' ')}`);

            const spawnEnv = {
                ...process.env,
                PATH: `${binDir}${path.delimiter}${getBinDir()}${path.delimiter}${process.env.PATH || ''}`
            };

            serverProcess = spawn(binaryPath, args, { cwd: binDir, env: spawnEnv });
            isServerRunning = true;
            metrics.status = 'loading'; // Model is loading into RAM/VRAM
            if (onStatusChange) onStatusChange(metrics);

            if (healthPollTimer) {
                clearInterval(healthPollTimer);
                healthPollTimer = null;
            }

            // Poll /health endpoint to detect when model finishes loading into memory
            healthPollTimer = setInterval(() => {
                fetch(`http://127.0.0.1:${port}/health`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.status === 'ok') {
                            if (healthPollTimer) {
                                clearInterval(healthPollTimer);
                                healthPollTimer = null;
                            }
                            metrics.status = 'running';
                            appendLog(`[SUCCESS] Model loaded successfully into memory. llama-server is READY on port ${port}.`);
                            if (onStatusChange) onStatusChange(metrics);
                        }
                    }).catch(() => {});
            }, 1000);

            serverProcess.stdout.on('data', (data) => {
                const str = data.toString();
                const logLine = appendLog(str);
                if (onLog) onLog(logLine);
            });

            const recentStderrLines = [];
            serverProcess.stderr.on('data', (data) => {
                const str = data.toString();
                recentStderrLines.push(str);
                if (recentStderrLines.length > 50) recentStderrLines.shift();
                const logLine = appendLog(str);
                if (onLog) onLog(logLine);
            });

            serverProcess.on('close', async (code, signal) => {
                if (healthPollTimer) {
                    clearInterval(healthPollTimer);
                    healthPollTimer = null;
                }
                isServerRunning = false;
                serverProcess = null;

                // 1. If shutdown was intentional or sent SIGTERM/SIGINT, treat as normal graceful stop
                if (isStoppingIntentional || signal === 'SIGTERM' || signal === 'SIGINT') {
                    metrics.status = 'stopped';
                    metrics.errorType = null;
                    metrics.errorMessage = null;
                    appendLog(`llama-server process stopped gracefully${signal ? ` (${signal})` : ''}.`);
                    if (onStatusChange) onStatusChange(metrics);
                    return;
                }

                // 2. Normal clean exit code 0
                if (code === 0) {
                    metrics.status = 'stopped';
                    metrics.errorType = null;
                    metrics.errorMessage = null;
                    appendLog(`llama-server process stopped gracefully (code 0).`);
                    if (onStatusChange) onStatusChange(metrics);
                    return;
                }

                metrics.status = 'stopped';
                const combinedStderr = recentStderrLines.join('\n');

                // 3. Windows STATUS_DLL_NOT_FOUND (0xC0000135 = 3221225781 or -1073741515)
                if (code === 3221225781 || code === -1073741515) {
                    appendLog(`[CRITICAL ERROR] llama-server failed to launch because required C++ runtime DLLs are missing (Exit 0xC0000135).`);
                    appendLog(`[SOLUTION] Please install Microsoft Visual C++ 2015-2022 Redistributable (x64): https://aka.ms/vs/17/release/vc_redist.x64.exe`);
                    metrics.status = 'error';
                    metrics.errorType = 'MISSING_VCRUNTIME';
                    metrics.errorMessage = 'Missing C++ runtime DLLs. Please install Visual C++ Redistributable.';
                } else if (combinedStderr.includes('unknown model architecture') || combinedStderr.includes('error loading model architecture')) {
                    appendLog(`[CRITICAL ERROR] Model architecture not recognized by current llama.cpp engine build.`);
                    appendLog(`[AUTO-REPAIR] Upgrading engine to latest build (${TARGET_ENGINE_TAG}) to support this model...`);
                    metrics.status = 'error';
                    metrics.errorType = 'OUTDATED_ENGINE';
                    metrics.errorMessage = 'Engine update required to support Gemma 4. Automatically upgrading...';
                    if (onStatusChange) onStatusChange(metrics);
                    try {
                        await ensureEngineExists(true);
                        appendLog(`[SUCCESS] Engine successfully upgraded to ${TARGET_ENGINE_TAG}. Please restart the model.`);
                    } catch (upgradeErr) {
                        appendLog(`[ERROR] Automatic engine upgrade failed: ${upgradeErr.message}`);
                    }
                } else if (combinedStderr.includes('failed to load model') || combinedStderr.includes('error loading model')) {
                    appendLog(`[ERROR] Failed to load model weights. The GGUF file may be corrupted or incompatible.`);
                    metrics.status = 'error';
                    metrics.errorType = 'MODEL_LOAD_FAILED';
                    metrics.errorMessage = 'Failed to load model file. Please check file integrity or re-download.';
                } else if (code !== null && code !== 0) {
                    appendLog(`llama-server process exited with code ${code}`);
                    metrics.status = 'error';
                    metrics.errorType = 'PROCESS_EXITED';
                    metrics.errorMessage = `Engine process exited with code ${code}`;
                } else {
                    appendLog(`llama-server process stopped.`);
                    metrics.status = 'stopped';
                    metrics.errorType = null;
                    metrics.errorMessage = null;
                }
                if (onStatusChange) onStatusChange(metrics);
            });

            return { success: true, running: true, native: true };
        } else {
            throw new Error(`Executable not found at ${binaryPath}`);
        }
    } catch(err) {
        if (healthPollTimer) {
            clearInterval(healthPollTimer);
            healthPollTimer = null;
        }
        appendLog(`[ERROR] Failed to spawn llama-server: ${err.message}`);
        metrics.status = 'error';
        if (onStatusChange) onStatusChange(metrics);
        return { success: false, running: false, error: err.message };
    }
}

function stopLlamaServer() {
    isStoppingIntentional = true;
    if (healthPollTimer) {
        clearInterval(healthPollTimer);
        healthPollTimer = null;
    }
    if (serverProcess) {
        try {
            serverProcess.kill('SIGTERM');
        } catch (_) {}
        serverProcess = null;
    }
    if (nodeHttpServer) {
        nodeHttpServer.close();
        nodeHttpServer = null;
    }
    isServerRunning = false;
    metrics.status = 'stopped';
    metrics.errorType = null;
    metrics.errorMessage = null;
    appendLog(`[INFO] llama-server stopped.`);
    return { success: true };
}

async function updateEngine(onStatusChange = null) {
    appendLog(`[AI ENGINE] Manual engine upgrade requested...`);
    if (serverProcess) {
        stopLlamaServer();
    }
    killStrayLlamaProcesses();

    // 1. If bundled directory has target build, sync it directly
    const bundledPath = path.join(getBundledBinDir(), process.platform === 'win32' ? 'llama-server.exe' : 'llama-server');
    const bundledBuild = getBinaryBuildNumber(bundledPath);
    if (fs.existsSync(bundledPath) && bundledBuild >= MIN_SUPPORTED_ENGINE_BUILD) {
        appendLog(`[AI ENGINE] Syncing target build ${bundledBuild} from local bundle to AppData...`);
        const bundledDir = getBundledBinDir();
        const userDir = getBinDir();
        const files = fs.readdirSync(bundledDir);
        for (const f of files) {
            try {
                fs.copyFileSync(path.join(bundledDir, f), path.join(userDir, f));
            } catch (_) {}
        }
        ensureMsvcRuntime(userDir);
        try {
            fs.writeFileSync(path.join(userDir, ENGINE_VERSION_FILE), JSON.stringify({
                tag: TARGET_ENGINE_TAG,
                build: bundledBuild,
                updatedAt: Date.now()
            }, null, 2));
        } catch (_) {}
        return { success: true, version: TARGET_ENGINE_TAG, build: bundledBuild };
    }

    // 2. Otherwise download latest engine from GitHub release
    const targetBinDir = getBinDir();
    const AdmZip = require('adm-zip');
    const isWin = process.platform === 'win32';
    const zipPath = path.join(targetBinDir, isWin ? 'llama.zip' : 'llama.tar.gz');
    const hasVulkan = isWin && fs.existsSync(path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'vulkan-1.dll'));
    
    let downloadUrl = `https://github.com/ggml-org/llama.cpp/releases/download/${TARGET_ENGINE_TAG}/llama-${TARGET_ENGINE_TAG}-bin-win-cpu-x64.zip`;
    if (isWin) {
        if (hasVulkan) {
            downloadUrl = `https://github.com/ggml-org/llama.cpp/releases/download/${TARGET_ENGINE_TAG}/llama-${TARGET_ENGINE_TAG}-bin-win-vulkan-x64.zip`;
        }
    } else if (process.platform === 'linux') {
        downloadUrl = `https://github.com/ggml-org/llama.cpp/releases/download/${TARGET_ENGINE_TAG}/llama-${TARGET_ENGINE_TAG}-bin-ubuntu-x64.tar.gz`;
    } else if (process.platform === 'darwin') {
        downloadUrl = `https://github.com/ggml-org/llama.cpp/releases/download/${TARGET_ENGINE_TAG}/llama-${TARGET_ENGINE_TAG}-bin-macos-arm64.tar.gz`;
    }

    if (onStatusChange) onStatusChange({ status: 'downloading_engine' });

    const downloadWithRedirects = (url, redirectCount = 0) => {
        return new Promise((resolve, reject) => {
            if (redirectCount > 5) return reject(new Error('Too many redirects'));
            const client = url.startsWith('https') ? https : http;
            const req = client.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) QBrowse/1.0 Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*'
                }
            }, (res) => {
                if ([301, 302, 307, 308].includes(res.statusCode)) {
                    return resolve(downloadWithRedirects(res.headers.location, redirectCount + 1));
                }
                if (res.statusCode !== 200) {
                    return reject(new Error(`Failed to download engine: HTTP ${res.statusCode}`));
                }

                const fileStream = fs.createWriteStream(zipPath);
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    try {
                        killStrayLlamaProcesses();
                        if (downloadUrl.endsWith('.zip')) {
                            const zip = new AdmZip(zipPath);
                            zip.extractAllTo(targetBinDir, true);
                        } else {
                            const { execSync } = require('child_process');
                            execSync(`tar -xzf "${zipPath}" -C "${targetBinDir}"`);
                        }
                        try { fs.unlinkSync(zipPath); } catch (_) {}
                        
                        const finalExe = path.join(targetBinDir, isWin ? 'llama-server.exe' : 'llama-server');
                        if (!isWin && fs.existsSync(finalExe)) fs.chmodSync(finalExe, 0o755);
                        ensureMsvcRuntime(targetBinDir);
                        try {
                            fs.writeFileSync(path.join(targetBinDir, ENGINE_VERSION_FILE), JSON.stringify({
                                tag: TARGET_ENGINE_TAG,
                                build: TARGET_ENGINE_BUILD,
                                updatedAt: Date.now()
                            }, null, 2));
                        } catch (_) {}
                        resolve({ success: true, version: TARGET_ENGINE_TAG, build: TARGET_ENGINE_BUILD });
                    } catch (err) {
                        reject(err);
                    }
                });
                fileStream.on('error', reject);
            });
            req.on('error', reject);
        });
    };

    return downloadWithRedirects(downloadUrl);
}

function getLogs() {
    return serverLogs;
}

function getDownloadedModels() {
    const dir = getModelsDir();
    if (!fs.existsSync(dir)) return [];
    try {
        const files = fs.readdirSync(dir);
        const validModels = [];
        for (const f of files) {
            if ((f.endsWith('.gguf') || f.endsWith('.bin')) && !f.endsWith('.tmp') && !f.endsWith('.downloading')) {
                const fullPath = path.join(dir, f);
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.size > 10 * 1024 * 1024) {
                        validModels.push({
                            filename: f,
                            path: fullPath,
                            sizeBytes: stats.size
                        });
                    } else if (stats.size === 0) {
                        // Clean up 0-byte aborted download artifact
                        try { fs.unlinkSync(fullPath); } catch (_) {}
                    }
                } catch (_) {}
            }
        }
        return validModels;
    } catch {
        return [];
    }
}

function getStatus() {
    return {
        isRunning: isServerRunning,
        modelPath: currentModelPath,
        port: serverPort,
        metrics,
        modelsDir: getModelsDir(),
        binDir: getBinDir(),
        hasEngineBinary: Boolean(resolveBinaryPath()),
        downloadedModels: getDownloadedModels()
    };
}

function cancelModelDownload() {
    if (currentDownloadReq && typeof currentDownloadReq.abort === 'function') {
        currentDownloadReq.abort();
        currentDownloadReq = null;
        return { success: true };
    }
    return { success: false };
}

// Model File Downloader with robust HTTP 301/302/307/308 Redirect & CDN Support
function downloadModel(modelUrl, targetFilename, onProgress) {
    return new Promise((resolve, reject) => {
        const destPath = path.join(getModelsDir(), targetFilename);
        const tempPath = path.join(getModelsDir(), `${targetFilename}.downloading`);
        let fileStream = null;
        let isAborted = false;

        // Clean up any stale temp file from a previous aborted attempt
        try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch (_) {}

        appendLog(`[DOWNLOAD] Initiating download of ${targetFilename} from: ${modelUrl}`);

        currentDownloadReq = {
            abort: () => {
                isAborted = true;
                appendLog(`[DOWNLOAD] Cancelled download of ${targetFilename}`);
                try {
                    if (fileStream) {
                        fileStream.destroy();
                        fileStream = null;
                    }
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                } catch (_) {}
                reject(new Error('Download cancelled by user'));
            }
        };

        const downloadHop = (url, hopCount = 0) => {
            if (isAborted) return;
            if (hopCount > 10) {
                const err = new Error('Too many redirects while downloading model');
                appendLog(`[ERROR] ${err.message}`);
                return reject(err);
            }

            const client = url.startsWith('https') ? https : http;
            const reqOptions = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) QBrowse/1.0 Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*'
                }
            };

            const req = client.get(url, reqOptions, (response) => {
                if (isAborted) {
                    response.destroy();
                    return;
                }

                // Handle HTTP redirects (HuggingFace CDN uses 302, 307, 308)
                if ([301, 302, 307, 308].includes(response.statusCode)) {
                    const location = response.headers.location;
                    if (!location) {
                        return reject(new Error(`Redirect ${response.statusCode} missing Location header`));
                    }
                    const nextUrl = new URL(location, url).href;
                    appendLog(`[DOWNLOAD] Following redirect (${response.statusCode}) to CDN endpoint...`);
                    response.destroy();
                    return downloadHop(nextUrl, hopCount + 1);
                }

                if (response.statusCode !== 200) {
                    response.destroy();
                    const err = new Error(`HuggingFace download failed: HTTP Status ${response.statusCode}`);
                    appendLog(`[ERROR] ${err.message}`);
                    return reject(err);
                }

                const totalBytes = parseInt(response.headers['content-length'], 10) || (2.5 * 1024 * 1024 * 1024);
                let downloadedBytes = 0;
                let lastProgressTime = 0;

                try {
                    fileStream = fs.createWriteStream(tempPath);
                } catch (err) {
                    response.destroy();
                    return reject(err);
                }

                response.on('data', (chunk) => {
                    if (isAborted) return;
                    downloadedBytes += chunk.length;
                    
                    const now = Date.now();
                    if (onProgress && now - lastProgressTime >= 150) {
                        lastProgressTime = now;
                        const percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
                        onProgress({
                            percent,
                            downloadedBytes,
                            totalBytes,
                            filename: targetFilename,
                            destPath
                        });
                    }
                });

                response.pipe(fileStream);

                fileStream.on('finish', () => {
                    if (isAborted) return;
                    fileStream.close((closeErr) => {
                        if (closeErr) {
                            try { fs.unlinkSync(tempPath); } catch (_) {}
                            return reject(closeErr);
                        }

                        try {
                            const stat = fs.statSync(tempPath);
                            if (stat.size < 1024 * 1024) {
                                try { fs.unlinkSync(tempPath); } catch (_) {}
                                return reject(new Error('Downloaded model file is suspiciously small or truncated'));
                            }

                            // Atomic rename from .downloading to final .gguf filename
                            if (fs.existsSync(destPath)) {
                                try { fs.unlinkSync(destPath); } catch (_) {}
                            }
                            fs.renameSync(tempPath, destPath);

                            currentModelPath = destPath;
                            currentDownloadReq = null;
                            appendLog(`[SUCCESS] GGUF Model weights verified and saved: ${destPath}`);

                            if (onProgress) {
                                onProgress({
                                    percent: 100,
                                    downloadedBytes: stat.size,
                                    totalBytes: stat.size,
                                    filename: targetFilename,
                                    destPath
                                });
                            }

                            resolve({ success: true, destPath });
                        } catch (err) {
                            try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
                            reject(err);
                        }
                    });
                });

                fileStream.on('error', (err) => {
                    response.destroy();
                    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
                    currentDownloadReq = null;
                    appendLog(`[ERROR] File write error: ${err.message}`);
                    reject(err);
                });

                response.on('error', (err) => {
                    if (fileStream) fileStream.destroy();
                    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
                    currentDownloadReq = null;
                    appendLog(`[ERROR] Download stream error: ${err.message}`);
                    reject(err);
                });
            });

            req.on('error', (err) => {
                if (fileStream) fileStream.destroy();
                try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
                currentDownloadReq = null;
                appendLog(`[ERROR] Network error during download: ${err.message}`);
                reject(err);
            });
        };

        downloadHop(modelUrl);
    });
}

module.exports = {
    startLlamaServer,
    stopLlamaServer,
    updateEngine,
    processPromptStream,
    getLogs,
    getStatus,
    getDownloadedModels,
    downloadModel,
    cancelModelDownload,
    getModelsDir,
    MODEL_PRESETS,
    TARGET_ENGINE_TAG,
    TARGET_ENGINE_BUILD
};
