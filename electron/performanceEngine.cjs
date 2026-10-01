const os = require('os');
const path = require('path');
const fs = require('fs');

let settingsPath = null;
let currentSettings = {
    mode: 'auto', // 'auto' | 'eco' | 'balanced' | 'ultra'
    tabSleepTimeoutMinutes: 15,
    reduceVisualsOnEco: true,
    autoBatterySaver: true
};

function initSettings(userDataPath) {
    settingsPath = path.join(userDataPath, 'performance_settings.json');
    try {
        if (fs.existsSync(settingsPath)) {
            const raw = fs.readFileSync(settingsPath, 'utf8');
            currentSettings = { ...currentSettings, ...JSON.parse(raw) };
        } else {
            saveSettings(currentSettings);
        }
    } catch (e) {
        console.warn('[PerformanceEngine] Failed to load settings:', e.message);
    }
}

function saveSettings(newSettings) {
    currentSettings = { ...currentSettings, ...newSettings };
    if (!settingsPath) return currentSettings;
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2), 'utf8');
    } catch (e) {
        console.warn('[PerformanceEngine] Failed to save settings:', e.message);
    }
    return currentSettings;
}

function detectHardwareProfile(gpuInfo = null, isOnBattery = false) {
    const cpus = os.cpus() || [];
    const coreCount = cpus.length;
    const cpuModel = cpus[0]?.model || 'Standard CPU';
    const totalMemBytes = os.totalmem();
    const totalMemGB = Math.round((totalMemBytes / (1024 * 1024 * 1024)) * 10) / 10;
    const freeMemBytes = os.freemem();
    const freeMemGB = Math.round((freeMemBytes / (1024 * 1024 * 1024)) * 10) / 10;

    // Evaluate GPU capabilities
    const glRenderer = gpuInfo?.auxAttributes?.glRenderer || '';
    const glVendor = gpuInfo?.auxAttributes?.glVendor || '';
    const driverVendor = gpuInfo?.gpuDevice?.[0]?.driverVendor || '';
    const deviceDesc = gpuInfo?.gpuDevice?.[0]?.description || '';
    const combinedGpuString = `${glRenderer} ${glVendor} ${driverVendor} ${deviceDesc}`.toLowerCase();

    const isSoftwareGpu = /swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(combinedGpuString);
    const isDedicatedGpu = /nvidia|geforce|radeon|amd|apple/i.test(combinedGpuString);

    // Score CPU (1 to 5)
    let cpuScore = 2;
    if (coreCount <= 2) cpuScore = 1;
    else if (coreCount <= 4) cpuScore = 2;
    else if (coreCount <= 7) cpuScore = 3;
    else if (coreCount < 16) cpuScore = 4;
    else cpuScore = 5;

    // Score RAM (1 to 5)
    let ramScore = 2;
    if (totalMemGB <= 4.5) ramScore = 1;
    else if (totalMemGB <= 8.5) ramScore = 2;
    else if (totalMemGB <= 16.5) ramScore = 3;
    else if (totalMemGB <= 32.5) ramScore = 4;
    else ramScore = 5;

    // Hardware composite score
    let score = cpuScore + ramScore;
    if (isSoftwareGpu) score -= 3;
    else if (isDedicatedGpu) score += 1;

    // Free memory penalty if system is starved
    if (freeMemGB < 1.2) score -= 1;

    // Determine detected tier
    let detectedTier = 'balanced';
    if (score <= 4 || totalMemGB <= 5 || isSoftwareGpu) {
        detectedTier = 'eco';
    } else if (score >= 8 && totalMemGB >= 15 && coreCount >= 8) {
        detectedTier = 'ultra';
    } else {
        detectedTier = 'balanced';
    }

    // Determine active tier based on user mode and battery status
    let activeTier = detectedTier;
    if (currentSettings.mode && currentSettings.mode !== 'auto') {
        activeTier = currentSettings.mode;
    } else if (isOnBattery && currentSettings.autoBatterySaver) {
        activeTier = 'eco';
    }

    // Recommended sleep timeout based on active tier
    let defaultSleepTimeout = 15;
    if (activeTier === 'eco') defaultSleepTimeout = 5;
    if (activeTier === 'ultra') defaultSleepTimeout = 30;

    const finalSleepTimeout = (currentSettings.tabSleepTimeoutMinutes !== undefined && currentSettings.tabSleepTimeoutMinutes !== null)
        ? currentSettings.tabSleepTimeoutMinutes
        : defaultSleepTimeout;

    return {
        coreCount,
        cpuModel,
        totalMemGB,
        freeMemGB,
        score,
        detectedTier,
        activeTier,
        isOnBattery,
        isSoftwareGpu,
        mode: currentSettings.mode,
        tabSleepTimeoutMinutes: finalSleepTimeout,
        reduceVisuals: activeTier === 'eco' && currentSettings.reduceVisualsOnEco,
        gpuRenderer: driverVendor || glRenderer || (isSoftwareGpu ? 'Software (CPU Fallback)' : 'Hardware Accelerated')
    };
}

module.exports = {
    initSettings,
    saveSettings,
    detectHardwareProfile,
    getSettings: () => currentSettings
};
