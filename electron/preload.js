const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    startSync: (config) => ipcRenderer.invoke('start-sync', config),
    getDefaultPath: () => ipcRenderer.invoke('get-default-path'),
    getAccountFolders: (path) => ipcRenderer.invoke('get-account-folders', path),
    onSyncProgress: (callback) => ipcRenderer.on('sync-progress', callback),
    minWindow: () => ipcRenderer.send('window-min'),
    closeWindow: () => ipcRenderer.send('window-close'),
    openUrl: (url) => ipcRenderer.send('open-url', url)
});
