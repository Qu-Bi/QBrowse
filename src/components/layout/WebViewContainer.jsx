import React, { useEffect, useRef } from 'react';
import useTabStore from '../../store/useTabStore';
import useUIStore from '../../store/useUIStore';
import { 
  createTabWebview, 
  hideTabWebview, 
  showTabWebview, 
  closeTabWebview, 
  navigateTabWebview, 
  setTabWebviewBounds 
} from '../../services/tauriIPC';

export default function WebViewContainer({ space }) {
  const containerRef = useRef(null);
  
  const privateTabs = useTabStore(state => state.privateTabs);
  const workTabs = useTabStore(state => state.workTabs);
  const ghostTabs = useTabStore(state => state.ghostTabs);
  const activeSpace = useTabStore(state => state.activeSpace);
  const currentUrl = useUIStore(state => state.currentUrl);
  
  // Find the tabs for this specific space
  const spaceTabs = space === 'prywatne' ? privateTabs 
                  : space === 'praca' ? workTabs 
                  : ghostTabs;
  
  const activeTab = spaceTabs.find(t => t.active);
  const isSpaceActive = activeSpace === space;
  
  // Track created webviews to avoid recreating them
  const createdWebviews = useRef(new Set());
  const currentBounds = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const updateBounds = () => {
    if (!containerRef.current || !activeTab || !activeTab.url) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // Only update if bounds changed significantly
    if (
      Math.abs(currentBounds.current.x - rect.x) > 1 ||
      Math.abs(currentBounds.current.y - rect.y) > 1 ||
      Math.abs(currentBounds.current.width - rect.width) > 1 ||
      Math.abs(currentBounds.current.height - rect.height) > 1
    ) {
      currentBounds.current = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      
      // Update bounds on backend
      if (createdWebviews.current.has(activeTab.id)) {
        setTabWebviewBounds(activeTab.id, rect.x, rect.y, rect.width, rect.height).catch(console.error);
      }
    }
  };

  useEffect(() => {
    // Setup ResizeObserver to track container bounds
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      updateBounds();
    });
    observer.observe(containerRef.current);
    // Observe window resize as well for safety
    window.addEventListener('resize', updateBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, [activeTab?.id]);

  useEffect(() => {
    // Sync webviews creation and visibility
    spaceTabs.forEach(tab => {
      if (!tab.url) return; // Skip new tabs

      // Ensure domain logic (Tauri needs http:// or https://)
      let targetUrl = tab.url;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
      }

      if (!createdWebviews.current.has(tab.id)) {
        // Create it
        createdWebviews.current.add(tab.id);
        createTabWebview(
          tab.id, 
          targetUrl, 
          currentBounds.current.x, 
          currentBounds.current.y, 
          currentBounds.current.width || 800, 
          currentBounds.current.height || 600
        ).then(() => {
          if (activeTab?.id === tab.id && isSpaceActive) {
            showTabWebview(tab.id).catch(console.error);
            updateBounds();
          } else {
            hideTabWebview(tab.id).catch(console.error);
          }
        }).catch(console.error);
      } else {
        // Already created, handle visibility
        if (activeTab?.id === tab.id && isSpaceActive) {
          showTabWebview(tab.id).catch(console.error);
          updateBounds();
        } else {
          hideTabWebview(tab.id).catch(console.error);
        }
      }
    });

    // Cleanup closed tabs
    const currentTabIds = new Set(spaceTabs.map(t => t.id));
    for (let tabId of createdWebviews.current) {
      if (!currentTabIds.has(tabId)) {
        closeTabWebview(tabId).catch(console.error);
        createdWebviews.current.delete(tabId);
      }
    }

  }, [spaceTabs, activeTab?.id, isSpaceActive]);

  // Handle URL changes for the active tab (e.g. from omnibox)
  useEffect(() => {
    if (activeTab && activeTab.url && createdWebviews.current.has(activeTab.id)) {
      let targetUrl = activeTab.url;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
      }
      // Assuming navigate happens when currentUrl changes globally.
      if (currentUrl === activeTab.url) {
        navigateTabWebview(activeTab.id, targetUrl).catch(console.error);
      }
    }
  }, [currentUrl, activeTab?.url]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 pointer-events-none z-[5]"
      style={{ opacity: 0 }} 
    />
  );
}
