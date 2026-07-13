import React, { useEffect } from 'react';
import useUIStore from './store/useUIStore';
import useTabStore from './store/useTabStore';

import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import MainFrame from './components/layout/MainFrame';

import Omnibox from './components/features/Omnibox';
import TabMap from './components/features/TabMap';
import ToolHub from './components/features/ToolHub';

import SettingsModal from './components/modals/SettingsModal';
import HistoryModal from './components/modals/HistoryModal';
import OnboardingWizard from './components/modals/OnboardingWizard';
import Overlays from './components/common/Overlays';

export default function App() {
    const isForceDark = useUIStore(state => state.isForceDark);
    const accentColor = useUIStore(state => state.accentColor);
    const toast = useUIStore(state => state.toast);
    const showToast = useUIStore(state => state.showToast);
    const closeContextMenus = useUIStore(state => state.closeContextMenus);
    const activeSpace = useTabStore(state => state.activeSpace);
    
    useEffect(() => {
        const handleKeyDown = (e) => {
            const cmdOrCtrl = e.metaKey || e.ctrlKey;
            
            if (cmdOrCtrl && e.key === '1') {
                e.preventDefault(); useTabStore.getState().setActiveSpace('prywatne'); showToast('Space: Personal');
            } else if (cmdOrCtrl && e.key === '2') {
                e.preventDefault(); useTabStore.getState().setActiveSpace('praca'); showToast('Space: Work');
            } else if (cmdOrCtrl && e.key === '3') {
                e.preventDefault(); useTabStore.getState().setActiveSpace('ghost'); showToast('Space: Ghost Mode');
            } else if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                const current = useTabStore.getState().activeSpace;
                useTabStore.getState().setActiveSpace(current === 'ghost' ? 'prywatne' : 'ghost');
                showToast(current !== 'ghost' ? 'Ghost Mode: Activated' : 'Ghost Mode: Deactivated');
            } else if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (useUIStore.getState().isOmniboxOpen) {
                    useUIStore.getState().closeOmnibox();
                } else {
                    useUIStore.getState().openOmnibox('');
                }
            } else if (cmdOrCtrl && e.key.toLowerCase() === 't') {
                e.preventDefault();
                useTabStore.getState().addTab({
                    id: Math.random().toString(36).substr(2, 9),
                    title: 'New Tab',
                    url: '',
                    active: true,
                    folderId: null
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showToast]);

    useEffect(() => {
        const root = document.documentElement;
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
        };

        const rgb = hexToRgb(activeSpace === 'ghost' ? '#a855f7' : accentColor);
        if (rgb) {
            root.style.setProperty('--accent', `rgb(${rgb})`);
            root.style.setProperty('--accent-10', `rgba(${rgb}, 0.1)`);
            root.style.setProperty('--accent-20', `rgba(${rgb}, 0.2)`);
            root.style.setProperty('--accent-30', `rgba(${rgb}, 0.3)`);
            root.style.setProperty('--accent-40', `rgba(${rgb}, 0.4)`);
        }
    }, [accentColor, activeSpace]);

    const handleContextMenu = (e) => {
        e.preventDefault();
        useUIStore.getState().setContextMenu({ x: e.clientX, y: e.clientY });
    };

    return (
        <div 
            className={`w-screen h-screen overflow-hidden flex font-sans select-none 
                ${isForceDark ? 'dark bg-black text-white' : 'bg-gray-100 text-black'} 
                ${activeSpace === 'ghost' ? 'dark' : ''}
            `}
            onClick={() => closeContextMenus()}
            onContextMenu={handleContextMenu}
        >
            <Sidebar />
            <div className="flex-1 flex flex-col h-screen relative z-10 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
                <TopBar />
                <MainFrame />
            </div>

            <Omnibox />
            <TabMap />
            <ToolHub />

            <SettingsModal />
            <HistoryModal />
            <OnboardingWizard />
            
            <Overlays />

            {toast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-white text-sm font-semibold shadow-2xl animate-pop-in">
                    {toast}
                </div>
            )}
        </div>
    );
}