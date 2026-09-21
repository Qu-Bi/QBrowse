import { create } from 'zustand';
import useUIStore from './useUIStore';

const defaultCircuit = [
    { role: 'Guard (Entry)', name: 'GuardRelay-DE', country: 'Germany', ip: '185.220.101.42', latency: '48ms' },
    { role: 'Middle Relay', name: 'RelayNode-NL', country: 'Netherlands', ip: '194.126.177.10', latency: '92ms' },
    { role: 'Exit Relay', name: 'ExitNode-CH', country: 'Switzerland', ip: '185.220.101.5', latency: '150ms', isExit: true }
];

const useTorStore = create((set, get) => ({
    isTorEnabled: false,
    status: 'stopped', // 'stopped' | 'downloading' | 'starting' | 'connected' | 'error'
    bootstrapProgress: 0,
    downloadProgress: 0,
    socksPort: 9050,
    controlPort: 9051,
    verifiedExitIp: null,
    isTorVerified: false,
    securityLevel: 'standard', // 'standard' | 'safer' | 'safest'
    hasLocalBinary: false,
    lastError: null,
    isCheckingIp: false,
    isRequestingCircuit: false,
    circuitNodes: defaultCircuit,
    listenersInitialized: false,

    toggleTorEnabled: async (forcedValue) => {
        const current = get().isTorEnabled;
        const next = typeof forcedValue === 'boolean' ? forcedValue : !current;
        set({ isTorEnabled: next });

        try {
            const { default: useTabStore } = await import('./useTabStore');
            const currentSpace = useTabStore.getState().activeSpace;
            if (next) {
                if (currentSpace === 'ghost') {
                    useTabStore.getState().setActiveSpace('tor');
                }
                get().startTor();
            } else {
                if (currentSpace === 'tor') {
                    useTabStore.getState().setActiveSpace('ghost');
                }
                get().stopTor();
            }
        } catch (err) {
            console.error('[TorStore] toggleTorEnabled error:', err);
        }
    },

    fetchStatus: async () => {
        if (!window.electronAPI?.torGetStatus) return;
        try {
            const data = await window.electronAPI.torGetStatus();
            set({
                status: data.status,
                bootstrapProgress: data.bootstrapProgress,
                socksPort: data.socksPort,
                controlPort: data.controlPort,
                verifiedExitIp: data.verifiedExitIp,
                securityLevel: data.securityLevel || 'standard',
                hasLocalBinary: data.hasLocalBinary,
                lastError: data.lastError
            });
            if (data.status === 'connected') {
                set({ isTorEnabled: true });
                get().fetchCircuit();
                get().checkExitIp();
            }
        } catch (err) {
            console.warn('[TorStore] Failed to fetch status:', err);
        }
    },

    startTor: async () => {
        if (!window.electronAPI?.torStart) {
            useUIStore.getState().showToast('Tor not supported in browser preview');
            return;
        }

        set({ isTorEnabled: true, status: 'starting', bootstrapProgress: 10, lastError: null });
        useUIStore.getState().showToast('Connecting to Tor Onion Network...');

        try {
            const res = await window.electronAPI.torStart();
            if (res.success) {
                set({ isTorEnabled: true, status: 'connected', bootstrapProgress: 100, socksPort: res.socksPort || 9050 });
                useUIStore.getState().showToast('Connected to Tor Network!');
                get().checkExitIp();
                get().fetchCircuit();
            } else {
                set({ status: 'error', lastError: res.error || 'Failed to start Tor' });
                useUIStore.getState().showToast(`Tor error: ${res.error || 'Connection failed'}`);
            }
        } catch (err) {
            set({ status: 'error', lastError: err.message });
            useUIStore.getState().showToast(`Tor failed: ${err.message}`);
        }
    },

    stopTor: async () => {
        if (!window.electronAPI?.torStop) return;
        try {
            await window.electronAPI.torStop();
            set({ isTorEnabled: false, status: 'stopped', bootstrapProgress: 0, verifiedExitIp: null, isTorVerified: false });
            useUIStore.getState().showToast('Tor Network disconnected');
        } catch (err) {
            console.error('[TorStore] Stop error:', err);
        }
    },

    newCircuit: async () => {
        if (!window.electronAPI?.torNewCircuit) return;
        if (get().isRequestingCircuit) return;

        set({ isRequestingCircuit: true });
        useUIStore.getState().showToast('Requesting new Tor identity...');

        try {
            const res = await window.electronAPI.torNewCircuit();
            if (res?.success) {
                if (res.exitIp && res.exitIp !== 'Unknown') {
                    set({ 
                        verifiedExitIp: res.exitIp, 
                        isTorVerified: !!res.isTor 
                    });
                }
                if (Array.isArray(res.circuitNodes) && res.circuitNodes.length > 0) {
                    set({ circuitNodes: res.circuitNodes });
                }
                useUIStore.getState().showToast(`New Tor identity active: ${res.exitIp || 'Circuit refreshed'}`);
            } else if (res?.rateLimited) {
                useUIStore.getState().showToast('Tor rate limit: wait 10s between new identities');
            } else {
                useUIStore.getState().showToast(`New identity: ${res?.message || 'Error requesting circuit'}`);
            }
        } catch (err) {
            useUIStore.getState().showToast(`Circuit error: ${err.message}`);
        } finally {
            set({ isRequestingCircuit: false });
        }
    },

    checkExitIp: async () => {
        if (!window.electronAPI?.torCheckIp) return;
        set({ isCheckingIp: true });
        try {
            const data = await window.electronAPI.torCheckIp();
            set({
                verifiedExitIp: data.ip,
                isTorVerified: !!data.isTor,
                isCheckingIp: false
            });
            if (data.isTor) {
                // Update exit node IP in circuit HUD
                set(state => ({
                    circuitNodes: state.circuitNodes.map((n, i) => i === 2 ? { ...n, ip: data.ip, name: `TorExit-${data.ip.split('.')[0]}` } : n)
                }));
            }
            return data;
        } catch (err) {
            set({ isCheckingIp: false });
        }
    },

    fetchCircuit: async () => {
        if (!window.electronAPI?.torGetCircuit) return;
        try {
            const nodes = await window.electronAPI.torGetCircuit();
            if (Array.isArray(nodes) && nodes.length > 0) {
                set({ circuitNodes: nodes });
            }
        } catch (err) {
            console.warn('[TorStore] Circuit fetch error:', err);
        }
    },

    downloadBinary: async () => {
        if (!window.electronAPI?.torDownloadBinary) return;
        set({ status: 'downloading', downloadProgress: 0, lastError: null });
        useUIStore.getState().showToast('Downloading official Tor Expert Bundle...');

        try {
            const res = await window.electronAPI.torDownloadBinary();
            if (res.success) {
                set({ status: 'stopped', hasLocalBinary: true, downloadProgress: 100 });
                useUIStore.getState().showToast('Tor Bundle installed successfully! Launching...');
                get().startTor();
            } else {
                set({ status: 'error', lastError: res.error });
                useUIStore.getState().showToast(`Download failed: ${res.error}`);
            }
        } catch (err) {
            set({ status: 'error', lastError: err.message });
            useUIStore.getState().showToast(`Install failed: ${err.message}`);
        }
    },

    setSecurityLevel: (level) => {
        if (window.electronAPI?.torSetSecurityLevel) {
            window.electronAPI.torSetSecurityLevel(level);
        }
        set({ securityLevel: level });
        const labels = {
            standard: 'Standard: All browser features enabled',
            safer: 'Safer: Audio/Video disabled on HTTP, WebGL disabled',
            safest: 'Safest: JavaScript completely disabled, icons & MathML disabled'
        };
        useUIStore.getState().showToast(`Tor Security Level: ${labels[level] || level}`);
    },

    init: () => {
        if (get().listenersInitialized || !window.electronAPI) return;
        set({ listenersInitialized: true });

        window.electronAPI.onTorStatus?.((status) => {
            set({ status });
            if (status === 'connected') {
                get().checkExitIp();
                get().fetchCircuit();
            }
        });

        window.electronAPI.onTorBootstrap?.((progress) => {
            set({ bootstrapProgress: progress });
        });

        window.electronAPI.onTorDownloadProgress?.((progress) => {
            set({ downloadProgress: progress });
        });

        get().fetchStatus();
    }
}));

if (typeof window !== 'undefined') {
    window.__torStore = useTorStore;
}

export default useTorStore;
