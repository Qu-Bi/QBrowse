import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const unlockVault = async (password) => {
  return await invoke('unlock_vault', { password });
};

export const sendAIMessage = async (message, contextEnabled, currentUrl) => {
  return await invoke('send_ai_message', { message, contextEnabled, currentUrl });
};

export const downloadLocalModel = async (onProgress) => {
  const unlisten = await listen('model_download_progress', (event) => {
    onProgress(event.payload.progress);
  });
  
  const success = await invoke('download_local_model');
  unlisten();
  return success;
};

export const executeCommand = async (commandId) => {
  return await invoke('execute_command', { commandId });
};

// Browser Webview APIs
export const createTabWebview = async (tabId, url, x, y, width, height) => {
  return await invoke('create_tab_webview', { tabId, url, x, y, width, height });
};

export const hideTabWebview = async (tabId) => {
  return await invoke('hide_tab_webview', { tabId });
};

export const showTabWebview = async (tabId) => {
  return await invoke('show_tab_webview', { tabId });
};

export const closeTabWebview = async (tabId) => {
  return await invoke('close_tab_webview', { tabId });
};

export const navigateTabWebview = async (tabId, url) => {
  return await invoke('navigate_tab_webview', { tabId, url });
};

export const setTabWebviewBounds = async (tabId, x, y, width, height) => {
  return await invoke('set_tab_webview_bounds', { tabId, x, y, width, height });
};
