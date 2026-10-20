export const listenToEvent = async (event, handler) => {
    // In Electron, we handle events differently depending on the component.
    // For navigation, we now listen to webview elements directly.
    return () => {}; // Dummy to satisfy old cleanup code
  };
  
  export const unlockVault = async (password) => {
    return await window.electronAPI.unlockVault(password);
  };
  
  export const unlockVaultWindowsHello = async () => {
    if (window.electronAPI && window.electronAPI.unlockVaultWindowsHello) {
        const res = await window.electronAPI.unlockVaultWindowsHello();
        if (typeof res === 'object' && res !== null && 'success' in res) {
            return res.success ? res : false;
        }
        return res;
    }
    return false;
  };
  
  export const addPassword = async (title, username, passwordPlaintext, url, masterPassword) => {
    return await window.electronAPI.addPassword(title, url, username, passwordPlaintext);
  };

  export const deletePassword = async (id) => {
    console.log('[electronIPC Debug] deletePassword called with id:', id);
    if (window.electronAPI && window.electronAPI.deletePassword) {
        const result = await window.electronAPI.deletePassword(id);
        console.log('[electronIPC Debug] window.electronAPI.deletePassword result:', result);
        return result;
    } else {
        console.warn('[electronIPC Debug] window.electronAPI.deletePassword is missing on window!');
    }
    return true;
  };
  
  export const updatePassword = async (id, title, url, username, passwordPlaintext) => {
    if (window.electronAPI && window.electronAPI.updatePassword) {
        return await window.electronAPI.updatePassword(id, title, url, username, passwordPlaintext);
    }
    return true;
  };
  
  export const getPasswords = async (masterPassword) => {
    return await window.electronAPI.getPasswords();
  };

  export const lockVault = async () => window.electronAPI?.lockVault ? await window.electronAPI.lockVault() : true;
  export const getVaultStatus = async () => window.electronAPI?.getVaultStatus ? await window.electronAPI.getVaultStatus() : null;
  export const setupVaultPin = async (pin, masterPassword) => window.electronAPI?.setupVaultPin ? await window.electronAPI.setupVaultPin(pin, masterPassword) : false;
  export const unlockVaultWithPin = async (pin) => window.electronAPI?.unlockVaultWithPin ? await window.electronAPI.unlockVaultWithPin(pin) : { success: false };
  export const removeVaultPin = async () => window.electronAPI?.removeVaultPin ? await window.electronAPI.removeVaultPin() : false;
  export const setupVaultWindowsHello = async (enable, masterPassword) => window.electronAPI?.setupVaultWindowsHello ? await window.electronAPI.setupVaultWindowsHello(enable, masterPassword) : false;
  export const resetVault = async () => window.electronAPI?.resetVault ? await window.electronAPI.resetVault() : false;
  export const wrapSyncSecret = async (secret) => window.electronAPI?.wrapSyncSecret ? await window.electronAPI.wrapSyncSecret(secret) : null;
  export const unwrapSyncSecret = async (wrapped) => window.electronAPI?.unwrapSyncSecret ? await window.electronAPI.unwrapSyncSecret(wrapped) : null;
  
  export const sendAIMessage = async (message, contextEnabled, currentUrl) => {
    // To be implemented in Electron
    console.log("sendAIMessage not implemented in Electron yet");
    return "AI is not fully ported to Electron yet.";
  };
  
  export const downloadLocalModel = async (onProgress) => {
    return true;
  };
  
  export const executeCommand = async (commandId) => {
    console.log("Execute command:", commandId);
  };
  
  export const windowMinimize = async () => await window.electronAPI.minimize();
  export const windowMaximize = async () => await window.electronAPI.maximize();
  export const windowShow = async () => {};
  export const windowClose = async () => await window.electronAPI.close();
  
  export const onGlobalNavigateBack = (callback) => {
    if (window.electronAPI && window.electronAPI.onGlobalNavigateBack) {
      window.electronAPI.onGlobalNavigateBack(callback);
    }
  };

  export const onGlobalNavigateForward = (callback) => {
    if (window.electronAPI && window.electronAPI.onGlobalNavigateForward) {
      window.electronAPI.onGlobalNavigateForward(callback);
    }
  };
  
  // Browser Webview APIs - OBSOLETE (Now handled natively by <webview>)
  export const createTabWebview = async () => {};
  export const hideTabWebview = async () => {};
  export const showTabWebview = async () => {};
  export const closeTabWebview = async () => {};
  export const navigateTabWebview = async () => {};
  export const setTabWebviewBounds = async () => {};
  export const executeJavascript = async () => {};
  
  // Adblock APIs - OBSOLETE (Now handled in main.cjs via session.webRequest)
  export const checkNetworkRequest = async () => false;
  export const getCosmeticCss = async () => "";
