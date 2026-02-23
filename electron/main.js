import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { syncChats } from './git-sync.js';
import fs from 'fs-extra';
import os from 'os';

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 860,
        height: 720,
        frame: false,
        transparent: true,
        icon: path.join(__dirname, '../favicon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('start-sync', async (event, config) => {
    try {
        const result = await syncChats(config, (progressMsg) => {
            mainWindow.webContents.send('sync-progress', progressMsg);
        });
        return { success: true, changes: result.changes, message: result.message };
    } catch (err) {
        return { success: false, message: err.message || err.toString() };
    }
});

ipcMain.handle('get-default-path', () => {
    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'Firestorm_x64');
    } else if (process.platform === 'linux') {
        return path.join(os.homedir(), '.firestorm_x64');
    }
    // Windows fallback
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Firestorm_x64');
});

ipcMain.handle('get-account-folders', async (event, firestormPath) => {
    try {
        if (!fs.existsSync(firestormPath)) return [];
        const items = await fs.promises.readdir(firestormPath, { withFileTypes: true });
        return items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .filter(name => !['browser_profile', 'logs', 'user_settings', 'windlight', 'toast_assets'].includes(name) && !name.startsWith('.'));
    } catch (e) {
        return [];
    }
});

ipcMain.on('window-min', () => mainWindow.minimize());
ipcMain.on('window-close', () => mainWindow.close());
ipcMain.on('open-url', (event, url) => shell.openExternal(url));
