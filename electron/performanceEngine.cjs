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

    // Detect hardware tier
    let detectedTier = 'balanced';
    if (coreCount <= 4 || totalMemGB <= 6) {
        detectedTier = 'eco';
    } else if (coreCount >= 8 && totalMemGB >= 16) {
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

    return {
        coreCount,
        cpuModel,
        totalMemGB,
        freeMemGB,
        detectedTier,
        activeTier,
        isOnBattery,
        mode: currentSettings.mode,
        tabSleepTimeoutMinutes: currentSettings.tabSleepTimeoutMinutes || defaultSleepTimeout,
        reduceVisuals: activeTier === 'eco' && currentSettings.reduceVisualsOnEco,
        gpuRenderer: gpuInfo?.gpuDevice?.[0]?.driverVendor || gpuInfo?.auxAttributes?.glRenderer || 'Hardware Accelerated'
    };
}

module.exports = {
    initSettings,
    saveSettings,
    detectHardwareProfile,
    getSettings: () => currentSettings
};
