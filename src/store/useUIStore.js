import { create } from 'zustand';

let globalToastTimeout = null;
let globalZoomTimeout = null;

const defaultSettings = {
    httpsOnly: true,
    isolation: false,
    webrtc: true,
    dnt: true,
    hardware: true,
    memory: true,
    suspendTimeout: '30m',
    smooth: true,
    battery: false,
    blockPopups: true,
    blockAutoplay: false,
    cosmetic: true,
    social: true,
    searchEngine: 'google',
    smartCalc: true,
    liveSearch: true,
    showFullUrls: false,
    searchInNewTab: false,
    askSave: false,
    groupDownloads: true,
    downloadSound: true,
    uiScale: 'comfortable',
    faviconGlow: true,
    doh: 'cloudflare'
};

const loadSettings = () => {
    try {
        const stored = localStorage.getItem('qbrowse_settings');
        if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
    } catch(e) {}
    return defaultSettings;
};

const useUIStore = create((set, get) => ({
  // Omnibox
  isOmniboxOpen: false,
  isOmniboxClosing: false,
  searchQuery: '',
  historySearchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  setHistorySearchQuery: (query) => set({ historySearchQuery: query }),
  openOmnibox: (url = '') => set({ isOmniboxOpen: true, isOmniboxClosing: false, searchQuery: (!url || url === 'about:blank') ? '' : url }),
  closeOmnibox: () => {
    set({ isOmniboxClosing: true });
    setTimeout(() => {
      set({ isOmniboxOpen: false, isOmniboxClosing: false, searchQuery: '' });
    }, 200);
  },

  // View States
  isSplitView: false,
  splitRightTabId: null,
  focusedPane: 'left', // 'left' | 'right'
  splitRatio: 50, // 50% width
  setIsSplitView: (val) => set({ isSplitView: val }),
  setSplitRightTabId: (id) => set({ splitRightTabId: id }),
  setFocusedPane: (pane) => set({ focusedPane: pane }),
  setSplitRatio: (ratio) => set({ splitRatio: ratio }),
  toggleSplitView: (targetRightId = null) => {
    const currentState = useUIStore.getState();
    const nextState = !currentState.isSplitView;

    if (!nextState) {
      useUIStore.setState({ isSplitView: false, splitRightTabId: null, focusedPane: 'left' });
      useUIStore.getState().showToast('Split View: Disabled');
      return;
    }

    let rightId = targetRightId;
    let spaceTabs = [];
    let activeTab = null;
    try {
      const tabStore = window.__tabStore?.getState();
      if (tabStore) {
        const space = tabStore.activeSpace;
        spaceTabs = space === 'personal' ? tabStore.privateTabs : (space === 'work' ? tabStore.workTabs : tabStore.ghostTabs);
        activeTab = spaceTabs.find(t => t.active);
      }
    } catch (_) {}

    if (rightId && (!spaceTabs.some(t => t.id === rightId) || (activeTab && rightId === activeTab.id))) {
      rightId = null;
    }

    if (!rightId) {
      if (currentState.splitRightTabId && spaceTabs.some(t => t.id === currentState.splitRightTabId) && (!activeTab || currentState.splitRightTabId !== activeTab.id)) {
        rightId = currentState.splitRightTabId;
      } else {
        const candidate = spaceTabs.find(t => t.id !== activeTab?.id);
        if (candidate) {
          rightId = candidate.id;
        }
      }
    }

    useUIStore.setState({ 
      isSplitView: true, 
      splitRightTabId: rightId || null,
      focusedPane: rightId ? 'right' : 'left'
    });
    useUIStore.getState().showToast(rightId ? 'Split View: Enabled' : 'Split View: Select a tab');
  },
  isFullscreen: false,
  setIsFullscreen: async (val) => {
    set({ isFullscreen: val });
  },
  isSidebarHidden: false,
  setIsSidebarHidden: (val) => set({ isSidebarHidden: val }),
  
  // Windows & Panels
  peekWindow: null,
  isPeekClosing: false,
  setPeekWindow: (win) => set({ peekWindow: win, isPeekClosing: false }),
  closePeek: () => {
    set({ isPeekClosing: true });
    setTimeout(() => {
      set({ peekWindow: null, isPeekClosing: false });
    }, 200);
  },
  
  pipWindow: null,
  isPipClosing: false,
  setPipWindow: (win) => set({ pipWindow: win, isPipClosing: false }),
  closePip: () => {
    set({ isPipClosing: true });
    setTimeout(() => set({ pipWindow: null, isPipClosing: false }), 200);
  },

  isRightPanelOpen: false,
  setIsRightPanelOpen: (val) => set({ isRightPanelOpen: val }),
  rightPanelTab: 'ai', // 'ai' | 'downloads' | 'settings' | 'history'
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  // Downloads
  downloads: [],
  setDownloads: (downloads) => set({ downloads }),
  addDownload: (download) => set(state => ({ downloads: [download, ...state.downloads] })),
  updateDownload: (id, updates) => set(state => ({
      downloads: state.downloads.map(d => d.id === id ? { ...d, ...updates } : d)
  })),

  activeDownloadPopup: null,
  setActiveDownloadPopup: (popup) => set({ activeDownloadPopup: popup }),

  // Navigation
  
  hoverPreview: null,
  setHoverPreview: (preview) => set({ hoverPreview: preview }),

  contextMenu: null,
  isContextMenuClosing: false,
  setContextMenu: (menu) => set({ contextMenu: menu, isContextMenuClosing: false }),
  closeContextMenu: () => {
    set({ isContextMenuClosing: true });
    setTimeout(() => set({ contextMenu: null, isContextMenuClosing: false }), 200);
  },

  tabContextMenu: null,
  isTabContextMenuClosing: false,
  setTabContextMenu: (menu) => set({ tabContextMenu: menu, isTabContextMenuClosing: false }),
  closeTabContextMenu: () => {
    set({ isTabContextMenuClosing: true });
    setTimeout(() => set({ tabContextMenu: null, isTabContextMenuClosing: false }), 200);
  },

  folderContextMenu: null,
  isFolderContextMenuClosing: false,
  setFolderContextMenu: (menu) => set({ folderContextMenu: menu, isFolderContextMenuClosing: false }),
  closeFolderContextMenu: () => {
    set({ isFolderContextMenuClosing: true });
    setTimeout(() => set({ folderContextMenu: null, isFolderContextMenuClosing: false }), 200);
  },

  closeContextMenus: () => {
    const state = useUIStore.getState();
    if (state.contextMenu) {
      set({ isContextMenuClosing: true });
      setTimeout(() => set({ contextMenu: null, isContextMenuClosing: false }), 200);
    }
    if (state.tabContextMenu) {
      set({ isTabContextMenuClosing: true });
      setTimeout(() => set({ tabContextMenu: null, isTabContextMenuClosing: false }), 200);
    }
    if (state.folderContextMenu) {
      set({ isFolderContextMenuClosing: true });
      setTimeout(() => set({ folderContextMenu: null, isFolderContextMenuClosing: false }), 200);
    }
  },


  currentUrl: '',
  setCurrentUrl: (url) => set({ currentUrl: url }),

  mediaState: {
      isPlaying: false,
      title: 'No media playing',
      artist: '',
      albumArt: '',
      currentTime: 0,
      duration: 0,
      url: '',
      tabId: null
  },
  setMediaState: (mediaData) => set(state => ({
      mediaState: { ...state.mediaState, ...mediaData }
  })),
  sendMediaCommand: (command) => {
      try {
          const webviews = Array.from(document.querySelectorAll('webview'));
          webviews.forEach(wv => {
              try {
                  wv.send('media-control-command', command);
              } catch(e) {}
          });
      } catch(e) {}
  },
  isRefreshing: false,
  refresh: () => {
    set({ isRefreshing: true });
    try {
        const wv = Array.from(document.querySelectorAll('webview')).find(w => w.style.visibility !== 'hidden' && w.style.display !== 'none');
        if (wv && typeof wv.reload === 'function') {
            wv.reload();
        }
    } catch (e) {}
    setTimeout(() => set({ isRefreshing: false }), 1000);
  },

  // Find in Page
  isFindOpen: false,
  findQuery: '',
  findMatchCase: false,
  findResults: { activeMatchOrdinal: 0, matches: 0 },
  getActiveWebView: () => {
    try {
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      const activeTab = tabStore?.getActiveTab ? tabStore.getActiveTab() : null;
      if (activeTab?.id) {
        const wv = document.getElementById(`webview-${activeTab.id}`);
        if (wv) return wv;
      }
      const webviews = Array.from(document.querySelectorAll('webview'));
      const visibleWv = webviews.find(w => {
        const parent = w.parentElement;
        if (!parent) return false;
        const style = window.getComputedStyle(parent);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && parseInt(style.zIndex, 10) > 0;
      });
      if (visibleWv) return visibleWv;
      return webviews[0] || null;
    } catch {
      return null;
    }
  },
  setIsFindOpen: (val) => {
    const currentState = get();
    if (!val && currentState.isFindOpen) {
      try {
        const wv = currentState.getActiveWebView();
        if (wv && typeof wv.stopFindInPage === 'function') {
          wv.stopFindInPage('clearSelection');
        }
      } catch (e) {}
      set({ isFindOpen: false, findResults: { activeMatchOrdinal: 0, matches: 0 } });
      try {
        const wv = currentState.getActiveWebView();
        if (wv && typeof wv.focus === 'function') {
          wv.focus();
        }
      } catch (e) {}
      return;
    }

    set({ isFindOpen: !!val, ...(val ? { isScreenshotBarOpen: false } : {}) });
    if (val) {
      const q = currentState.findQuery;
      if (q) {
        get().executeFind(q, { forward: true, findNext: false });
      }
    }
  },
  setFindQuery: (query) => {
    set({ findQuery: query });
    if (!query) {
      try {
        const wv = get().getActiveWebView();
        if (wv && typeof wv.stopFindInPage === 'function') {
          wv.stopFindInPage('clearSelection');
        }
      } catch (e) {}
      set({ findResults: { activeMatchOrdinal: 0, matches: 0 } });
      return;
    }
    get().executeFind(query, { forward: true, findNext: false });
  },
  setFindMatchCase: (matchCase) => {
    set({ findMatchCase: matchCase });
    const q = get().findQuery;
    if (q) {
      get().executeFind(q, { forward: true, findNext: false, matchCase });
    }
  },
  setFindResults: (results) => set({ findResults: results }),
  executeFind: (query, { forward = true, findNext = false, matchCase } = {}) => {
    if (!query) return;
    const caseSensitive = typeof matchCase === 'boolean' ? matchCase : get().findMatchCase;
    try {
      const wv = get().getActiveWebView();
      if (wv && typeof wv.findInPage === 'function') {
        wv.findInPage(query, { forward, findNext, matchCase: caseSensitive });
      }
    } catch (e) {
      console.warn('[FindInPage] execute error:', e);
    }
  },
  findNextMatch: (forward = true) => {
    const { findQuery, isFindOpen } = get();
    if (!isFindOpen) {
      get().setIsFindOpen(true);
      return;
    }
    if (!findQuery) return;
    get().executeFind(findQuery, { forward, findNext: true });
  },

  // Printing & PDF Export
  printActivePage: () => {
    try {
      const wv = get().getActiveWebView();
      if (wv && typeof wv.print === 'function') {
        wv.print();
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('[Print] error triggering print:', e);
      window.print();
    }
  },

  saveActivePageAsPDF: async () => {
    try {
      const wv = get().getActiveWebView();
      if (!wv) {
        get().showToast('No active webpage to export');
        return;
      }

      let title = 'Webpage';
      try {
        if (typeof wv.getTitle === 'function') {
          title = wv.getTitle() || title;
        }
      } catch (_) {}

      if (title === 'Webpage' && window.__tabStore) {
        try {
          const tab = window.__tabStore.getState()?.getActiveTab?.();
          if (tab?.title) title = tab.title;
        } catch (_) {}
      }

      const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 80) || 'Webpage';
      const defaultName = `${safeTitle}.pdf`;

      get().showToast('Generating Clean PDF...');

      if (typeof wv.printToPDF !== 'function') {
        get().showToast('PDF export not supported on this view');
        return;
      }

      // Temporarily remove dark mode inversion/filter so PDF prints as crisp, clean black text on white paper
      let wasDark = false;
      try {
        if (typeof wv.executeJavaScript === 'function') {
          wasDark = await wv.executeJavaScript(`
            (function() {
              const doc = document.documentElement;
              const hasDark = doc.classList.contains('qbrowse-smart-dark-active');
              if (hasDark) doc.classList.remove('qbrowse-smart-dark-active');
              return hasDark;
            })()
          `);
        }
      } catch (_) {}

      // Short yield to let DOM style recalc apply
      await new Promise(r => setTimeout(r, 80));

      let pdfData = null;
      try {
        pdfData = await wv.printToPDF({
          landscape: false,
          displayHeaderFooter: false,
          printBackground: true,
          pageSize: 'A4'
        });
      } finally {
        if (wasDark) {
          try {
            if (typeof wv.executeJavaScript === 'function') {
              await wv.executeJavaScript(`document.documentElement.classList.add('qbrowse-smart-dark-active')`);
            }
          } catch (_) {}
        }
      }

      if (!pdfData || pdfData.length === 0) {
        get().showToast('Failed to generate PDF');
        return;
      }

      if (window.electronAPI && typeof window.electronAPI.savePdfFile === 'function') {
        const res = await window.electronAPI.savePdfFile({
          defaultName,
          data: pdfData
        });
        if (res?.success) {
          get().showToast('PDF exported successfully');
        } else if (!res?.canceled) {
          get().showToast(`PDF export failed: ${res?.error || 'Unknown error'}`);
        }
      } else {
        const blob = new Blob([pdfData], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
        get().showToast('PDF downloaded');
      }
    } catch (e) {
      console.error('[PDF Export] error:', e);
      get().showToast(`PDF export failed: ${e.message}`);
    }
  },

  // Webpage Screenshot & Snipping Tool
  isScreenshotBarOpen: false,
  isSnippingMode: false,
  lastScreenshotPath: null,
  setIsScreenshotBarOpen: (val) => {
    if (val) {
      if (get().isFindOpen) {
        get().setIsFindOpen(false);
      }
      set({ isScreenshotBarOpen: true });
    } else {
      set({ isScreenshotBarOpen: false });
    }
  },
  setIsSnippingMode: (val) => set({ isSnippingMode: !!val }),
  openLastScreenshotFolder: () => {
    const { lastScreenshotPath } = get();
    if (lastScreenshotPath && window.electronAPI && typeof window.electronAPI.showItemInFolder === 'function') {
      window.electronAPI.showItemInFolder(lastScreenshotPath);
    }
  },

  captureVisibleViewport: async () => {
    try {
      get().showToast('Capturing visible viewport...');
      const wv = get().getActiveWebView();
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      const activeTab = tabStore?.getActiveTab ? tabStore.getActiveTab() : null;
      const title = activeTab?.title || 'Webpage';

      let rect = null;
      if (wv) {
        const r = wv.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          rect = {
            x: Math.round(r.left),
            y: Math.round(r.top),
            width: Math.round(r.width),
            height: Math.round(r.height)
          };
        }
      }

      if (window.electronAPI && typeof window.electronAPI.captureAndSave === 'function') {
        const res = await window.electronAPI.captureAndSave({ rect, title });
        if (res?.success) {
          set({ lastScreenshotPath: res.filePath });
          get().showToast('Screenshot saved to Downloads & copied to clipboard!');
        } else {
          get().showToast(`Failed to capture screenshot: ${res?.error || 'Unknown error'}`);
        }
      }
    } catch (e) {
      console.error('[Screenshot] Visible capture error:', e);
      get().showToast(`Screenshot failed: ${e.message}`);
    }
  },

  captureFullPage: async () => {
    try {
      const wv = get().getActiveWebView();
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      const activeTab = tabStore?.getActiveTab ? tabStore.getActiveTab() : null;
      const isOnNewTab = !activeTab || !activeTab.url || activeTab.url === '' || activeTab.url === 'about:blank';

      if (isOnNewTab || !wv) {
        get().showToast('Open a website to capture a full scrolling page');
        return;
      }

      get().showToast('Capturing full webpage (scrolling down)...');

      // 1. Get webpage scroll metrics and store original scroll position
      const metrics = await wv.executeJavaScript(`
        (function() {
          const body = document.body;
          const html = document.documentElement;
          const totalHeight = Math.max(
            body.scrollHeight, body.offsetHeight,
            html.clientHeight, html.scrollHeight, html.offsetHeight
          );
          return {
            totalHeight: Math.min(totalHeight, 20000),
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
            origX: window.scrollX,
            origY: window.scrollY
          };
        })()
      `);

      const { totalHeight, viewportHeight, viewportWidth, origX, origY } = metrics;
      const title = activeTab?.title || 'Webpage';

      const wvRect = wv.getBoundingClientRect();
      const cropRect = {
        x: Math.round(wvRect.left),
        y: Math.round(wvRect.top),
        width: Math.round(wvRect.width),
        height: Math.round(wvRect.height)
      };

      // If page is not taller than the viewport, do a single viewport capture!
      if (totalHeight <= viewportHeight + 20) {
        if (window.electronAPI && typeof window.electronAPI.captureAndSave === 'function') {
          const res = await window.electronAPI.captureAndSave({ rect: cropRect, title });
          if (res?.success) {
            set({ lastScreenshotPath: res.filePath });
            get().showToast('Full page screenshot saved & copied to clipboard!');
          }
        }
        return;
      }

      // 2. Set up offscreen Canvas for stitching
      const canvas = document.createElement('canvas');
      canvas.width = cropRect.width;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');

      let currentY = 0;
      while (currentY < totalHeight) {
        // Scroll the webview to currentY
        await wv.executeJavaScript(`window.scrollTo(0, ${currentY})`);
        // Wait 120ms for Chromium to paint the newly scrolled content
        await new Promise(r => setTimeout(r, 120));

        // Capture this slice from the webview area
        if (window.electronAPI && typeof window.electronAPI.captureSliceDataUrl === 'function') {
          const sliceDataUrl = await window.electronAPI.captureSliceDataUrl(cropRect);
          if (sliceDataUrl) {
            const sliceImg = await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = () => resolve(null);
              img.src = sliceDataUrl;
            });

            if (sliceImg) {
              const remainingHeight = totalHeight - currentY;
              if (remainingHeight < viewportHeight) {
                // Last slice: draw the bottom portion of the slice to avoid overlap
                const scale = sliceImg.height / viewportHeight;
                const srcH = remainingHeight * scale;
                const srcY = sliceImg.height - srcH;
                ctx.drawImage(
                  sliceImg,
                  0, srcY, sliceImg.width, srcH,
                  0, currentY, cropRect.width, remainingHeight
                );
              } else {
                ctx.drawImage(sliceImg, 0, currentY, cropRect.width, viewportHeight);
              }
            }
          }
        }

        currentY += viewportHeight;
      }

      // 3. Restore original user scroll position
      await wv.executeJavaScript(`window.scrollTo(${origX}, ${origY})`);

      // 4. Save stitched canvas to disk and clipboard
      const finalDataUrl = canvas.toDataURL('image/png');
      if (window.electronAPI && typeof window.electronAPI.saveScreenshotDataUrl === 'function') {
        const res = await window.electronAPI.saveScreenshotDataUrl({
          dataUrl: finalDataUrl,
          title,
          copyToClipboard: true
        });
        if (res?.success) {
          set({ lastScreenshotPath: res.filePath });
          get().showToast('Full page screenshot saved & copied to clipboard!');
        } else {
          get().showToast(`Failed to save screenshot: ${res?.error || 'Unknown error'}`);
        }
      }
    } catch (e) {
      console.error('[Screenshot] Full page error:', e);
      get().showToast(`Full page screenshot failed: ${e.message}`);
    }
  },

  captureSelectedArea: async (rect) => {
    try {
      get().showToast('Capturing snip...');
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      const activeTab = tabStore?.getActiveTab ? tabStore.getActiveTab() : null;
      const title = activeTab?.title || 'Snip';

      if (window.electronAPI && typeof window.electronAPI.captureAndSave === 'function') {
        const res = await window.electronAPI.captureAndSave({ rect, title });
        if (res?.success) {
          set({ lastScreenshotPath: res.filePath });
          get().showToast('Snip saved to Downloads & copied to clipboard!');
        } else {
          get().showToast(`Failed to save snip: ${res?.error || 'Unknown error'}`);
        }
      }
    } catch (e) {
      console.error('[Screenshot] Snip error:', e);
      get().showToast(`Snip failed: ${e.message}`);
    }
  },

  // Notifications
  toast: null,
  showToast: (message) => {
    set({ toast: message });
    if (globalToastTimeout) clearTimeout(globalToastTimeout);
    globalToastTimeout = setTimeout(() => set({ toast: null }), 2500);
  },

  // Tab Map
  isTabMapOpen: false,
  isTabMapClosing: false,
  openTabMap: () => set({ isTabMapOpen: true, isTabMapClosing: false }),
  closeTabMap: () => {
    set({ isTabMapClosing: true });
    setTimeout(() => set({ isTabMapOpen: false, isTabMapClosing: false }), 300);
  },

  // Popovers & Context Menus
  activePopover: null,
  isPopoverClosing: false,
  openPopover: (popover) => set({ activePopover: popover, isPopoverClosing: false }),
  closePopover: () => {
    set({ isPopoverClosing: true });
    setTimeout(() => set({ activePopover: null, isPopoverClosing: false }), 200);
  },
  togglePopover: (popover) => {
    if (useUIStore.getState().activePopover === popover) {
      useUIStore.getState().closePopover();
    } else {
      set({ activePopover: popover, isPopoverClosing: false });
    }
  },
  mediaState: {
      isPlaying: false,
      title: '',
      artist: '',
      albumArt: '',
      currentTime: 0,
      duration: 0,
      tabId: null
  },
  setMediaState: (mediaObj) => set(state => ({
      mediaState: { ...state.mediaState, ...mediaObj }
  })),
  sendMediaCommand: (cmd) => {
      const commandName = typeof cmd === 'string' ? cmd : (cmd ? cmd.action : 'unknown');
      console.log(`[QBrowse MediaControl] 🚀 Dispatching command: "${commandName}"`, cmd);
      
      const webviews = Array.from(document.querySelectorAll('webview'));
      console.log(`[QBrowse MediaControl] Found ${webviews.length} active webview tag(s) in DOM`);
      
      if (webviews.length === 0) {
          console.warn('[QBrowse MediaControl] ⚠️ No webview elements found in DOM!');
      }

      webviews.forEach((wv, index) => {
          try {
              if (commandName === 'toggle-pip' || commandName === 'pip') {
                  console.log(`[QBrowse MediaControl] Executing userGesture PiP on webview #${index}`);
                  if (typeof wv.executeJavaScript === 'function') {
                      wv.executeJavaScript(`
                          (async () => {
                              try {
                                  if (document.pictureInPictureElement) {
                                      await document.exitPictureInPicture();
                                      return 'exited-pip';
                                  }

                                  const videoEls = Array.from(document.querySelectorAll('video'));
                                  const activeVideo = videoEls.find(v => !v.paused && v.readyState > 1) || videoEls[0];

                                  if (activeVideo) {
                                      activeVideo.removeAttribute('disablepictureinpicture');
                                      activeVideo.disablePictureInPicture = false;
                                      await activeVideo.requestPictureInPicture();
                                      return 'native-pip-success';
                                  }

                                  const ytPlayer = document.querySelector('#movie_player, .html5-video-player');
                                  if (ytPlayer && typeof ytPlayer.togglePictureInPicture === 'function') {
                                      ytPlayer.togglePictureInPicture();
                                      return 'yt-player-pip';
                                  }

                                  const pipBtn = document.querySelector('.ytp-pip-button, button[title*="Picture-in-picture"]');
                                  if (pipBtn) {
                                      pipBtn.click();
                                      return 'pip-btn-clicked';
                                  }

                                  return 'no-video-found';
                              } catch(e) {
                                  return 'pip-error: ' + e.toString();
                              }
                          })();
                      `, true)
                      .then(res => console.log(`[QBrowse MediaControl] 🎉 PiP result on webview #${index}:`, res))
                      .catch(err => console.warn(`[QBrowse MediaControl] PiP execution warning on webview #${index}:`, err));
                  }
              }

              if (typeof wv.send === 'function') {
                  wv.send('media-control-command', cmd);
                  console.log(`[QBrowse MediaControl] ✅ Successfully sent "${commandName}" to webview #${index} (${wv.src || 'about:blank'})`);
              }
          } catch (e) {
              console.error(`[QBrowse MediaControl] ❌ Error sending command to webview #${index}:`, e);
          }
      });
  },


  // Hover Preview
  hoverPreview: null,
  setHoverPreview: (preview) => set({ hoverPreview: preview }),

  // Passkey Prompt
  passkeyPrompt: null,
  setPasskeyPrompt: (prompt) => set({ passkeyPrompt: prompt }),

  // Modals & Settings
  activeModal: localStorage.getItem('qbrowse_setup_complete') !== 'true' 
    ? 'onboarding' 
    : (localStorage.getItem('qbrowse_tutorial_done') !== 'true' ? 'tutorial' : null),
  isModalClosing: false,
  closingModal: null,
  openModal: (modal) => set({ activeModal: modal, isModalClosing: false, closingModal: null }),
  closeModal: () => {
    set(state => ({ isModalClosing: true, closingModal: state.activeModal }));
    setTimeout(() => set({ activeModal: null, closingModal: null, isModalClosing: false, onboardingStep: 0, tutorialStep: 0 }), 200);
  },

  settingsTab: 'appearance',
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  user: null,
  setUser: (user) => set({ user }),

  isForceDark: localStorage.getItem('qbrowse_isForceDark') === 'true',
  setIsForceDark: (val) => {
      set({ isForceDark: val });
      localStorage.setItem('qbrowse_isForceDark', val);
  },
  isAdblockActive: true,
  setIsAdblockActive: (val) => {
      set({ isAdblockActive: val });
      try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('set-adblock', val);
      } catch(e) {}
  },
  
  adblockStats: { count: 0, domains: [] },
  addBlockedTracker: (url) => set((state) => {
      try {
          const domain = new URL(url).hostname;
          const newDomains = [domain, ...state.adblockStats.domains.filter(d => d !== domain)].slice(0, 5);
          return {
              adblockStats: {
                  count: state.adblockStats.count + 1,
                  domains: newDomains
              }
          };
      } catch (e) { return state; }
  }),

  darkExclusions: (() => {
      try {
          const stored = localStorage.getItem('qbrowse_dark_exclusions');
          if (stored) return JSON.parse(stored);
      } catch (e) {}
      return ['youtube.com'];
  })(),
  setDarkExclusions: (exclusions) => {
      set({ darkExclusions: exclusions });
      localStorage.setItem('qbrowse_dark_exclusions', JSON.stringify(exclusions));
  },
  
  settings: loadSettings(),
  toggleSetting: (key) => {
      set((state) => {
          const newSettings = { ...state.settings, [key]: !state.settings[key] };
          localStorage.setItem('qbrowse_settings', JSON.stringify(newSettings));
          
          if (['hardware', 'isolation'].includes(key)) {
              useUIStore.getState().showToast('Restart required for engine changes.');
          }
          if (window.electronAPI && window.electronAPI.invoke) {
              window.electronAPI.invoke('save-setting', { key, value: newSettings[key] });
          }
          return { settings: newSettings };
      });
  },
  setSettingValue: (key, value) => {
      set((state) => {
          const newSettings = { ...state.settings, [key]: value };
          try {
              localStorage.setItem('qbrowse_settings', JSON.stringify(newSettings));
          } catch(e) {}
          if (window.electronAPI && window.electronAPI.saveSetting) {
              window.electronAPI.saveSetting(key, value);
          }
          return { settings: newSettings };
      });
  },

  zoomLevel: 100,
  isZoomHUDVisible: false,
  setZoomLevel: (val) => {
    const clamped = Math.min(200, Math.max(50, Math.round(val)));
    set({ zoomLevel: clamped, isZoomHUDVisible: true });
    if (globalZoomTimeout) clearTimeout(globalZoomTimeout);
    globalZoomTimeout = setTimeout(() => {
      set({ isZoomHUDVisible: false });
    }, 1800);
  },
  hideZoomHUD: () => {
    if (globalZoomTimeout) clearTimeout(globalZoomTimeout);
    set({ isZoomHUDVisible: false });
  },
  isGlassEnabled: true,
  setIsGlassEnabled: (val) => set({ isGlassEnabled: val }),
  isSwipeEnabled: true,
  setIsSwipeEnabled: (val) => set({ isSwipeEnabled: val }),
  // Webview Fullscreen
  isWebviewFullscreen: false,
  setIsWebviewFullscreen: (val) => set({ isWebviewFullscreen: val }),

  // Theme & Appearance
  darkExclusions: ['youtube.com', 'github.com', 'figma.com'],
  accentColor: '#d4bc94',
  setAccentColor: (color) => set({ accentColor: color }),

  // Onboarding & Tutorial
  setupComplete: localStorage.getItem('qbrowse_setup_complete') === 'true',
  setSetupComplete: (val) => {
      set({ setupComplete: val });
      localStorage.setItem('qbrowse_setup_complete', val ? 'true' : 'false');
  },
  tutorialDone: localStorage.getItem('qbrowse_tutorial_done') === 'true',
  setTutorialDone: (val) => {
      set({ tutorialDone: val });
      localStorage.setItem('qbrowse_tutorial_done', val ? 'true' : 'false');
  },
  onboardingStep: 0,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  tutorialStep: 0,
  setTutorialStep: (step) => set({ tutorialStep: step }),
  obUsername: '',
  setObUsername: (val) => set({ obUsername: val }),
  obPassword: '',
  setObPassword: (val) => set({ obPassword: val }),

  // Tab Switcher Overlay
  showSwitcher: false,
  showSwitcherUI: false,
  switcherIndex: 0,
  switcherTabs: [],
  setShowSwitcher: (val) => set({ showSwitcher: val, showSwitcherUI: val }),
  setSwitcherIndex: (idx) => set({ switcherIndex: idx }),
  setSwitcherTabs: (tabs) => set({ switcherTabs: tabs }),
  openSwitcher: () => {
    const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
    if (!tabStore) return;
    const list = tabStore.getActiveList ? tabStore.getActiveList() : [];
    if (!list || list.length <= 1) return;

    // Arrange in MRU order: current active tab is index 0, last active tab is index 1
    const activeTab = list.find(t => t.active);
    const otherTabs = list.filter(t => !t.active).sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
    const mruTabs = activeTab ? [activeTab, ...otherTabs] : otherTabs;

    if (window.__switcherTimer) clearTimeout(window.__switcherTimer);
    window.__switcherTimer = setTimeout(() => {
      set({ showSwitcherUI: true });
    }, 140);

    set({
      showSwitcher: true,
      showSwitcherUI: false,
      switcherTabs: mruTabs,
      switcherIndex: 1
    });
  },
  cycleSwitcher: (direction = 1) => {
    const state = useUIStore.getState();
    if (!state.showSwitcher) {
      useUIStore.getState().openSwitcher();
      return;
    }
    if (window.__switcherTimer) {
      clearTimeout(window.__switcherTimer);
      window.__switcherTimer = null;
    }
    const len = state.switcherTabs.length;
    if (len === 0) return;
    const nextIdx = (state.switcherIndex + direction + len) % len;
    set({ switcherIndex: nextIdx, showSwitcherUI: true });
  },
  confirmSwitcher: () => {
    if (window.__switcherTimer) {
      clearTimeout(window.__switcherTimer);
      window.__switcherTimer = null;
    }
    const { showSwitcher, switcherTabs, switcherIndex } = useUIStore.getState();
    if (!showSwitcher) return;

    const targetTab = switcherTabs[switcherIndex];
    set({ showSwitcher: false, showSwitcherUI: false });

    if (targetTab) {
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      if (tabStore) {
        tabStore.handleSwitchToTab(targetTab.id, tabStore.activeSpace);
        useUIStore.getState().setCurrentUrl(targetTab.url || '');
      }
    }
  },
  cancelSwitcher: () => {
    if (window.__switcherTimer) {
      clearTimeout(window.__switcherTimer);
      window.__switcherTimer = null;
    }
    set({ showSwitcher: false, showSwitcherUI: false });
  },
}));

export default useUIStore;
