const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    startSync: (config) => ipcRenderer.invoke('start-sync', config),
    getDefaultPath: () => ipcRenderer.invoke('get-default-path'),
    onSyncProgress: (callback) => ipcRenderer.on('sync-progress', callback)
});
