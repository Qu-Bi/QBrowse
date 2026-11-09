import React, { useEffect, useRef } from 'react';

/**
 * High-Performance Liquid Glass Tooltip Engine for QBrowse (Item #42)
 * - Single reusable DOM portal (Zero React re-renders on hover)
 * - Automatic retrofitting of all native HTML title attributes via MutationObserver
 * - 60-120fps hardware-composited transforms with visionOS liquid glass aesthetics
 * - Automatic keyboard shortcut badge parsing & viewport collision clamping
 */

// Regex patterns to detect shortcuts: (Cmd+B), (Ctrl+Alt+R), (Esc), (Shift+Enter / Shift+F3), etc.
const SHORTCUT_REGEX = /\((?:(?:Ctrl|Cmd|CMD|Alt|Shift|Option|Meta|Super|Win)\s*[\+\-]\s*)*[A-Za-z0-9\+\-\/\s\\]{1,20}\)|\((?:Esc|Escape|Enter|Return|Space|Backspace|Delete|Tab|F\d{1,2})\)/i;

export default function LiquidTooltip() {
    const tooltipRef = useRef(null);
    const labelRef = useRef(null);
    const kbdRef = useRef(null);
    const subtextRef = useRef(null);

    useEffect(() => {
        const tooltipEl = tooltipRef.current;
        const labelEl = labelRef.current;
        const kbdEl = kbdRef.current;
        const subtextEl = subtextRef.current;
        if (!tooltipEl || !labelEl || !kbdEl || !subtextEl) return;

        let currentTrigger = null;
        let showTimer = null;
        let warmTimer = null;
        let isWarm = false;

        // 1. Convert title attribute to data-q-tooltip & aria-label
        const sanitizeElement = (el) => {
            if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
            if (el.tagName === 'IFRAME') return; // Preserve iframe accessibility
            if (el.hasAttribute('title')) {
                const titleVal = el.getAttribute('title');
                if (titleVal && titleVal.trim()) {
                    el.setAttribute('data-q-tooltip', titleVal.trim());
                    if (!el.hasAttribute('aria-label')) {
                        el.setAttribute('aria-label', titleVal.trim());
                    }
                }
                el.removeAttribute('title');
            }
        };

        // Scan existing DOM once on mount
        document.querySelectorAll('[title]').forEach(sanitizeElement);

        // 2. MutationObserver for continuous zero-effort title suppression
        const observer = new MutationObserver((mutations) => {
            for (let i = 0; i < mutations.length; i++) {
                const target = mutations[i].target;
                if (target && target.nodeType === Node.ELEMENT_NODE) {
                    sanitizeElement(target);
                    // Live-update active tooltip if title was updated dynamically while hovered
                    if (target === currentTrigger && tooltipEl.dataset.state === 'visible') {
                        const newText = target.getAttribute('data-q-tooltip') || target.getAttribute('data-tooltip');
                        if (newText) {
                            renderContent(newText, target);
                            positionTooltip(target);
                        } else {
                            hideTooltip(true);
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['title'],
            subtree: true,
        });

        // 3. String parser for keyboard shortcuts and subtext hints
        const parseTooltipText = (rawText, trigger) => {
            // Check explicit override attributes first
            const explicitShortcut = trigger.getAttribute('data-tooltip-shortcut');
            const explicitSubtext = trigger.getAttribute('data-tooltip-subtext');
            if (explicitShortcut || explicitSubtext) {
                return {
                    label: rawText,
                    shortcut: explicitShortcut || null,
                    subtext: explicitSubtext || null,
                };
            }

            let text = rawText.trim();
            let shortcut = null;
            let subtext = null;

            // Handle compound parenthetical formats where shortcut and subtext are grouped, e.g.
            // "New Tab in Personal (CMD+T • Middle-click for background)"
            // "Back (Alt+Left • Middle-click background)"
            // "Split View (Ctrl+\ or Ctrl+Shift+D • Right-click to hide)"
            const compoundMatch = text.match(/^(.*?)\(([^)]+?)\s+•\s+(.*?)\)$/);
            if (compoundMatch) {
                text = compoundMatch[1].trim();
                const candidate = compoundMatch[2].trim();
                const remainder = compoundMatch[3].trim();

                if (candidate.match(/^(?:(?:Ctrl|Cmd|CMD|Alt|Shift|Option|Meta|Super|Win)\s*[\+\-]\s*)*[A-Za-z0-9\+\-\/\s\\]{1,25}$/i)) {
                    shortcut = candidate;
                    subtext = remainder;
                } else {
                    subtext = `${candidate} • ${remainder}`;
                }
            } else {
                // Standard bullet separation
                if (text.includes(' • ')) {
                    const parts = text.split(' • ');
                    text = parts[0].trim();
                    subtext = parts.slice(1).join(' • ').trim();
                    if (subtext.endsWith(')') && !subtext.includes('(')) {
                        subtext = subtext.slice(0, -1).trim();
                    }
                }

                // Extract keyboard shortcuts in parentheses: (Cmd+T)
                const match = text.match(SHORTCUT_REGEX);
                if (match) {
                    shortcut = match[0].replace(/^\(|\)$/g, '').trim();
                    text = text.replace(match[0], '').trim();
                } else if (text.includes('(')) {
                    // Handle unclosed shortcut parenthetical if one part got cut
                    const unclosed = text.match(/\(((?:(?:Ctrl|Cmd|CMD|Alt|Shift|Option|Meta|Super|Win)\s*[\+\-]\s*)*[A-Za-z0-9\+\-\/\s\\]{1,25})$/i);
                    if (unclosed) {
                        shortcut = unclosed[1].trim();
                        text = text.replace(unclosed[0], '').trim();
                    }
                }
            }

            // Clean any trailing or leading unclosed paren artifacts
            if (text.endsWith('(')) {
                text = text.slice(0, -1).trim();
            }

            return { label: text || rawText, shortcut, subtext };
        };

        const renderContent = (rawText, trigger) => {
            const { label, shortcut, subtext } = parseTooltipText(rawText, trigger);
            labelEl.textContent = label;

            if (shortcut) {
                kbdEl.textContent = shortcut;
                kbdEl.style.display = 'inline-flex';
            } else {
                kbdEl.style.display = 'none';
            }

            if (subtext) {
                subtextEl.textContent = `• ${subtext}`;
                subtextEl.style.display = 'inline';
            } else {
                subtextEl.style.display = 'none';
            }
        };

        // 4. Viewport edge collision solver & GPU transform positioning
        const positionTooltip = (trigger) => {
            const targetRect = trigger.getBoundingClientRect();
            // If element is hidden/detached, dismiss
            if (targetRect.width === 0 && targetRect.height === 0) {
                hideTooltip(true);
                return;
            }

            const tooltipWidth = tooltipEl.offsetWidth;
            const tooltipHeight = tooltipEl.offsetHeight;
            const gap = 7;
            const padding = 8;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // Placement preference
            let placement = trigger.getAttribute('data-tooltip-pos');
            if (!placement) {
                if (targetRect.top < 85) {
                    placement = 'bottom';
                } else if (targetRect.left < 260) {
                    placement = 'right';
                } else if (targetRect.right > vw - 260) {
                    placement = 'left';
                } else if (targetRect.bottom > vh - 85) {
                    placement = 'top';
                } else {
                    placement = 'top';
                }
            }

            let top = 0;
            let left = 0;

            if (placement === 'bottom') {
                top = targetRect.bottom + gap;
                left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
                if (top + tooltipHeight > vh - padding) {
                    top = targetRect.top - tooltipHeight - gap; // Flip top
                }
            } else if (placement === 'top') {
                top = targetRect.top - tooltipHeight - gap;
                left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
                if (top < padding) {
                    top = targetRect.bottom + gap; // Flip bottom
                }
            } else if (placement === 'right') {
                left = targetRect.right + gap;
                top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
                if (left + tooltipWidth > vw - padding) {
                    left = targetRect.left - tooltipWidth - gap; // Flip left
                }
            } else if (placement === 'left') {
                left = targetRect.left - tooltipWidth - gap;
                top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
                if (left < padding) {
                    left = targetRect.right + gap; // Flip right
                }
            }

            // Safe clamping to screen viewport
            left = Math.max(padding, Math.min(left, vw - tooltipWidth - padding));
            top = Math.max(padding, Math.min(top, vh - tooltipHeight - padding));

            const roundedLeft = Math.round(left);
            const roundedTop = Math.round(top);

            tooltipEl.style.transform = `translate3d(${roundedLeft}px, ${roundedTop}px, 0)`;
        };

        const showTooltip = (trigger, text) => {
            if (!trigger || !text) return;
            renderContent(text, trigger);
            positionTooltip(trigger);
            tooltipEl.setAttribute('data-state', 'visible');
            isWarm = true;
            if (warmTimer) clearTimeout(warmTimer);
        };

        const hideTooltip = (immediate = false) => {
            if (showTimer) {
                clearTimeout(showTimer);
                showTimer = null;
            }
            tooltipEl.setAttribute('data-state', 'hidden');
            currentTrigger = null;

            if (immediate) {
                isWarm = false;
                if (warmTimer) clearTimeout(warmTimer);
            } else {
                if (warmTimer) clearTimeout(warmTimer);
                warmTimer = setTimeout(() => {
                    isWarm = false;
                }, 250);
            }
        };

        // 5. Delegated Pointer Events
        const handlePointerOver = (e) => {
            if (e.pointerType === 'touch') return; // Ignore mobile/touch taps
            const target = e.target;
            if (!target || !(target instanceof Element)) return;

            // Find closest tooltip trigger
            const trigger = target.closest('[data-q-tooltip], [data-tooltip], [title]');
            if (!trigger) return;

            // Check suppression flag
            if (trigger.hasAttribute('data-no-tooltip') || trigger.getAttribute('data-tooltip') === 'none') {
                return;
            }

            // Strip native title if still present
            sanitizeElement(trigger);

            const text = trigger.getAttribute('data-q-tooltip') || trigger.getAttribute('data-tooltip');
            if (!text || !text.trim()) return;

            if (trigger === currentTrigger) return;
            currentTrigger = trigger;

            if (showTimer) clearTimeout(showTimer);

            // Ergonomic delay: 30ms if warm, user-configured or 250ms cold
            const customDelay = trigger.getAttribute('data-tooltip-delay');
            const delay = isWarm ? 30 : (customDelay ? parseInt(customDelay, 10) : 250);

            showTimer = setTimeout(() => {
                showTooltip(trigger, text);
            }, delay);
        };

        const handlePointerOut = (e) => {
            if (!currentTrigger) return;
            const related = e.relatedTarget;
            // Ignore if moving into an inner child (e.g., SVG path or child span)
            if (related && currentTrigger.contains(related)) {
                return;
            }
            hideTooltip(false);
        };

        // Instant dismissal triggers (Zero lag on action)
        const handleInstantDismiss = () => hideTooltip(true);

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' || e.key === 'Enter') handleInstantDismiss();
        };

        document.addEventListener('pointerover', handlePointerOver, { capture: true, passive: true });
        document.addEventListener('pointerout', handlePointerOut, { capture: true, passive: true });
        document.addEventListener('pointerdown', handleInstantDismiss, { capture: true, passive: true });
        document.addEventListener('contextmenu', handleInstantDismiss, { capture: true, passive: true });
        document.addEventListener('wheel', handleInstantDismiss, { capture: true, passive: true });
        document.addEventListener('dragstart', handleInstantDismiss, { capture: true, passive: true });
        window.addEventListener('keydown', handleKeyDown, { capture: true, passive: true });
        window.addEventListener('blur', handleInstantDismiss);

        return () => {
            observer.disconnect();
            if (showTimer) clearTimeout(showTimer);
            if (warmTimer) clearTimeout(warmTimer);
            document.removeEventListener('pointerover', handlePointerOver, { capture: true });
            document.removeEventListener('pointerout', handlePointerOut, { capture: true });
            document.removeEventListener('pointerdown', handleInstantDismiss, { capture: true });
            document.removeEventListener('contextmenu', handleInstantDismiss, { capture: true });
            document.removeEventListener('wheel', handleInstantDismiss, { capture: true });
            document.removeEventListener('dragstart', handleInstantDismiss, { capture: true });
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            window.removeEventListener('blur', handleInstantDismiss);
        };
    }, []);

    return (
        <div
            id="q-liquid-tooltip"
            ref={tooltipRef}
            data-state="hidden"
            aria-hidden="true"
        >
            <span ref={labelRef} className="q-tooltip-label" />
            <kbd ref={kbdRef} className="q-tooltip-kbd" style={{ display: 'none' }} />
            <span ref={subtextRef} className="q-tooltip-subtext" style={{ display: 'none' }} />
        </div>
    );
}
