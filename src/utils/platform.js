export const isLinuxPlatform = () => {
    const platform = (
        (typeof window !== 'undefined' && window.electronAPI?.platform) ||
        (typeof process !== 'undefined' && process?.platform) ||
        (typeof navigator !== 'undefined' && (navigator.userAgentData?.platform || navigator.platform)) ||
        ''
    );
    return platform.toLowerCase().includes('linux');
};
