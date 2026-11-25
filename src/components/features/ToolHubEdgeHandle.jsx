import React from 'react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function ToolHubEdgeHandle() {
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isRightPanelOpen = useUIStore(state => state.isRightPanelOpen);
    const setIsRightPanelOpen = useUIStore(state => state.setIsRightPanelOpen);
    const toolHubPosition = useUIStore(state => state.settings?.toolHubPosition || 'right');
    const activeModal = useUIStore(state => state.activeModal);
    const isModalClosing = useUIStore(state => state.isModalClosing);

    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const isHandleHidden = Boolean(activeModal || isModalClosing || isRightPanelOpen);

    return (
        <div
            id="tour-toolhub-trigger"
            className={`fixed ${
                toolHubPosition === 'left'
                    ? 'left-0 justify-start pl-1 rounded-r-xl'
                    : 'right-0 justify-end pr-1 rounded-l-xl'
            } top-1/2 -translate-y-1/2 w-4 h-40 z-[40000] cursor-pointer group flex items-center transition-all duration-300 ease-out ${
                isHandleHidden
                    ? `opacity-0 pointer-events-none ${toolHubPosition === 'left' ? '-translate-x-4' : 'translate-x-4'} select-none`
                    : 'opacity-100 pointer-events-auto translate-x-0'
            }`}
            onClick={() => {
                if (!isHandleHidden) {
                    setIsRightPanelOpen(true);
                }
            }}
        >
            <div
                className={`w-1 h-12 rounded-full transition-all duration-300 ease-out group-hover:h-24 ${
                    isHandleHidden
                        ? 'bg-transparent'
                        : `${isBright ? 'bg-black/15' : 'bg-white/15'} group-hover:bg-accent/60 group-hover:shadow-[0_0_15px_var(--accent-30)]`
                }`}
            />
        </div>
    );
}
