import React, { useEffect } from 'react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import HelpLegalContent from '../common/HelpLegalContent';
import { getLiquidGlassSurfaceClasses } from '../common/ContextMenuProvider';

export default function HelpLegalModal() {
    const activeModal = useUIStore(state => state.activeModal);
    const isModalClosing = useUIStore(state => state.isModalClosing);
    const closingModal = useUIStore(state => state.closingModal);
    const closeModal = useUIStore(state => state.closeModal);
    const helpLegalTab = useUIStore(state => state.helpLegalTab) || 'help';
    const setHelpLegalTab = useUIStore(state => state.setHelpLegalTab);
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);

    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const isClosingThis = isModalClosing && closingModal === 'help';
    const isOpen = activeModal === 'help' || isClosingThis;

    useEffect(() => {
        if (activeModal !== 'help') return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [activeModal, closeModal]);

    if (!isOpen) return null;

    return (
        <div
            onClick={closeModal}
            className={`fixed inset-0 z-[50000] flex items-center justify-center p-4 sm:p-6 ${
                isBright ? 'bg-black/25 backdrop-blur-md' : 'bg-black/55 backdrop-blur-md'
            } ${isClosingThis ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'}`}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-5xl h-[84vh] rounded-3xl overflow-hidden flex flex-col ${getLiquidGlassSurfaceClasses(isBright)} ${
                    isBright ? 'bg-white/85' : 'bg-[#0c0d14]/88'
                } ${isClosingThis ? 'animate-modal-spring-out' : 'animate-modal-spring'}`}
                style={{
                    backdropFilter: 'blur(var(--glass-blur, 32px)) saturate(185%)',
                    WebkitBackdropFilter: 'blur(var(--glass-blur, 32px)) saturate(185%)'
                }}
            >
                <HelpLegalContent
                    activeTab={helpLegalTab}
                    onTabChange={setHelpLegalTab}
                    onClose={closeModal}
                    mode="modal"
                />
            </div>
        </div>
    );
}
