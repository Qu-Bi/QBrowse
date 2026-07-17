export const listenToEvent = async (event, handler) => {
    // In Electron, we handle events differently depending on the component.
    // For navigation, we now listen to webview elements directly.
    return () => {}; // Dummy to satisfy old cleanup code
  };
  
  export const unlockVault = async (password) => {
    return await window.electronAPI.unlockVault(password);
  };
  
  export const addPassword = async (title, username, passwordPlaintext, url, masterPassword) => {
    return await window.electronAPI.addPassword(title, url, username, passwordPlaintext);
  };
  
  export const getPasswords = async (masterPassword) => {
    return await window.electronAPI.getPasswords();
  };
  
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
