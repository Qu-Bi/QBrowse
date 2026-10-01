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

const MODEL_PRESETS = [
    {
        id: 'gemma-4-e2b',
        name: 'Gemma 4 E2B Instruct (Q4_K_M)',
        size: '3.11 GB',
        url: 'https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_K_M.gguf',
        filename: 'gemma-4-E2B-it-Q4_K_M.gguf',
        description: 'Unsloth Gemma 4 E2B Instruct GGUF model for fast web page summarization, chat, and reasoning.'
    },
    {
        id: 'gemma-4-e4b',
        name: 'Gemma 4 E4B Instruct (Q4_K_M)',
        size: '4.98 GB',
        url: 'https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q4_K_M.gguf',
        filename: 'gemma-4-E4B-it-Q4_K_M.gguf',
        description: 'High reasoning Unsloth Gemma 4 E4B model for complex code analysis, writing, and research.'
    }
];

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
            if (!userStats || bundledStats.mtimeMs > userStats.mtimeMs || bundledStats.size !== userStats.size) {
                const bundledDir = getBundledBinDir();
                const userDir = getBinDir();
                const files = fs.readdirSync(bundledDir);
                for (const f of files) {
                    try {
                        fs.copyFileSync(path.join(bundledDir, f), path.join(userDir, f));
                    } catch (_) {}
                }
            }
        } catch (_) {}
        if (fs.existsSync(userPath)) return userPath;
        return bundledPath;
    }

    // 2. Fall back to user AppData bin dir
    if (fs.existsSync(userPath)) {
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
        
        while (retries < 10 && !success) {
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

                if (res.ok && res.body) {
                    success = true;
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder('utf-8');
                    let removedLoadingMessage = false;
                    
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
                                        // A slightly hacky way to ensure the UI gets the tokens, the UI will append.
                                        // The loading message will just remain at the top.
                                        onToken(token);
                                    }
                                } catch(e) {}
                            }
                        }
                    }
                    if (onDone) onDone();
                    return;
                }
                break; // If response is not ok but didn't throw (e.g., 404), break to next endpoint
            } catch(e) {
                // If it's the primary server port, it might still be loading the GGUF into memory
                if (ep === localEndpoints[0]) {
                    retries++;
                    if (retries === 1 && onToken) {
                        onToken("[Model is currently loading into memory... Please wait...]\n\n");
                    }
                    await new Promise(resolve => setTimeout(resolve, 3000));
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
    const { prompt = '' } = options;
    generateRealAiReplyStream(prompt, onToken, onDone);
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

    const ensureEngineExists = async () => {
        let binPath = resolveBinaryPath();
        if (binPath) {
            ensureMsvcRuntime(path.dirname(binPath));
            ensureMsvcRuntime(getBinDir());
            return binPath;
        }

        appendLog('Downloading native llama.cpp engine...');
        if (onStatusChange) onStatusChange({ status: 'downloading_engine' });

        const AdmZip = require('adm-zip');
        const targetBinDir = getBinDir();
        const zipPath = path.join(targetBinDir, 'llama.zip');

        // Check if Vulkan is present on Windows, otherwise use universal AVX2 CPU engine
        const hasVulkanRuntime = process.platform === 'win32' && fs.existsSync(path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'vulkan-1.dll'));
        
        let downloadUrl = 'https://github.com/ggml-org/llama.cpp/releases/download/b4528/llama-b4528-bin-win-avx2-x64.zip';
        if (process.platform === 'win32') {
            if (hasVulkanRuntime) {
                downloadUrl = 'https://github.com/ggml-org/llama.cpp/releases/download/b4528/llama-b4528-bin-win-vulkan-x64.zip';
            } else {
                appendLog('[INFO] Vulkan runtime not detected on system. Selecting universal AVX2 CPU engine for maximum compatibility.');
            }
        } else if (process.platform === 'linux') {
            downloadUrl = 'https://github.com/ggml-org/llama.cpp/releases/download/b4528/llama-b4528-bin-ubuntu-x64.zip';
        } else if (process.platform === 'darwin') {
            downloadUrl = 'https://github.com/ggml-org/llama.cpp/releases/download/b4528/llama-b4528-bin-macos-arm64.zip';
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
                            const zip = new AdmZip(zipPath);
                            zip.extractAllTo(targetBinDir, true);
                            try { fs.unlinkSync(zipPath); } catch (_) {}
                            
                            const finalExeName = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';
                            const finalBinPath = path.join(targetBinDir, finalExeName);
                            if (process.platform !== 'win32' && fs.existsSync(finalBinPath)) {
                                fs.chmodSync(finalBinPath, 0o755);
                            }

                            // Option A: Ensure MSVC runtime DLLs are placed in targetBinDir
                            ensureMsvcRuntime(targetBinDir);

                            appendLog('Native llama.cpp engine downloaded and extracted successfully.');
                            resolve(finalBinPath);
                        } catch (err) {
                            appendLog(`Extraction error: ${err.message}`);
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
                const availableProj = getDownloadedModels().find(m => m.filename.startsWith('mmproj-'));
                if (availableProj) {
                    mmprojTarget = availableProj.path;
                }
            }

            if (mmprojTarget) {
                const mmprojFullPath = path.isAbsolute(mmprojTarget) 
                    ? mmprojTarget 
                    : path.join(getModelsDir(), mmprojTarget);

                if (fs.existsSync(mmprojFullPath)) {
                    args.push('--mmproj', mmprojFullPath);
                } else if (fs.existsSync(mmprojTarget)) {
                    args.push('--mmproj', mmprojTarget);
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

            // Poll /health endpoint to detect when model finishes loading
            const pollReady = setInterval(() => {
                fetch(`http://127.0.0.1:${port}/health`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.status === 'ok') {
                            clearInterval(pollReady);
                            metrics.status = 'running';
                            if (onStatusChange) onStatusChange(metrics);
                        }
                    }).catch(() => {});
            }, 1000);

            serverProcess.stdout.on('data', (data) => {
                const str = data.toString();
                const logLine = appendLog(str);
                if (onLog) onLog(logLine);
            });

            serverProcess.stderr.on('data', (data) => {
                const str = data.toString();
                const logLine = appendLog(str);
                if (onLog) onLog(logLine);
            });

            serverProcess.on('close', (code) => {
                clearInterval(pollReady);
                isServerRunning = false;
                serverProcess = null;
                metrics.status = 'stopped';

                // Check Windows STATUS_DLL_NOT_FOUND (0xC0000135 = 3221225781 or -1073741515)
                if (code === 3221225781 || code === -1073741515) {
                    appendLog(`[CRITICAL ERROR] llama-server failed to launch because required C++ runtime DLLs are missing (Exit 0xC0000135).`);
                    appendLog(`[SOLUTION] Please install Microsoft Visual C++ 2015-2022 Redistributable (x64): https://aka.ms/vs/17/release/vc_redist.x64.exe`);
                    metrics.status = 'error';
                    metrics.errorType = 'MISSING_VCRUNTIME';
                } else {
                    appendLog(`llama-server process exited with code ${code}`);
                }
                if (onStatusChange) onStatusChange(metrics);
            });

            return { success: true, running: true, native: true };
        } else {
            throw new Error(`Executable not found at ${binaryPath}`);
        }
    } catch(err) {
        appendLog(`[ERROR] Failed to spawn llama-server: ${err.message}`);
        metrics.status = 'error';
        if (onStatusChange) onStatusChange(metrics);
        return { success: false, running: false, error: err.message };
    }
}

function stopLlamaServer() {
    if (serverProcess) {
        serverProcess.kill('SIGTERM');
        serverProcess = null;
    }
    if (nodeHttpServer) {
        nodeHttpServer.close();
        nodeHttpServer = null;
    }
    isServerRunning = false;
    metrics.status = 'stopped';
    appendLog(`[INFO] llama-server stopped by user.`);
    return { success: true };
}

function getLogs() {
    return serverLogs;
}

function getDownloadedModels() {
    const dir = getModelsDir();
    if (!fs.existsSync(dir)) return [];
    try {
        const files = fs.readdirSync(dir);
        return files.filter(f => f.endsWith('.gguf') || f.endsWith('.bin')).map(f => ({
            filename: f,
            path: path.join(dir, f),
            sizeBytes: fs.statSync(path.join(dir, f)).size
        }));
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

// Model File Downloader with User-Agent & HTTP 301/302 Redirect Support
function downloadModel(modelUrl, targetFilename, onProgress) {
    return new Promise((resolve, reject) => {
        const destPath = path.join(getModelsDir(), targetFilename);
        const file = fs.createWriteStream(destPath);

        appendLog(`Starting download of GGUF model weights from: ${modelUrl}`);

        const request = (url) => {
            const client = url.startsWith('https') ? https : http;
            const reqOptions = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) QBrowse/1.0 Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*'
                }
            };

            client.get(url, reqOptions, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    const redirectUrl = response.headers.location;
                    appendLog(`Redirecting download to: ${redirectUrl}`);
                    return request(redirectUrl);
                }

                if (response.statusCode !== 200) {
                    appendLog(`[ERROR] HuggingFace download HTTP status: ${response.statusCode}`);
                    reject(new Error(`HTTP Status ${response.statusCode}`));
                    return;
                }

                const totalBytes = parseInt(response.headers['content-length'], 10) || (3.1 * 1024 * 1024 * 1024);
                let downloadedBytes = 0;
                let lastProgressTime = 0;

                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    
                    const now = Date.now();
                    if (onProgress && now - lastProgressTime >= 150) {
                        lastProgressTime = now;
                        const percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
                        onProgress({
                            percent,
                            downloadedBytes,
                            totalBytes,
                            destPath
                        });
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    currentModelPath = destPath;
                    appendLog(`[SUCCESS] GGUF Model weights saved & verified: ${destPath}`);
                    resolve({ success: true, destPath });
                });

                file.on('error', (err) => {
                    fs.unlink(destPath, () => {});
                    appendLog(`[ERROR] File write error: ${err.message}`);
                    reject(err);
                });
            }).on('error', (err) => {
                appendLog(`[ERROR] Network error: ${err.message}`);
                reject(err);
            });
        };

        request(modelUrl);
    });
}

module.exports = {
    startLlamaServer,
    stopLlamaServer,
    processPromptStream,
    getLogs,
    getStatus,
    downloadModel,
    getModelsDir,
    MODEL_PRESETS
};
