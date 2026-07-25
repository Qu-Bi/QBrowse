export async function performWebSearch(query) {
    if (window.electronAPI && window.electronAPI.webSearch) {
        return await window.electronAPI.webSearch(query);
    }
    return "Web search is only available in the desktop app environment.";
}
