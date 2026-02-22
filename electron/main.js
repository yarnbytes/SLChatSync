import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncChats } from './git-sync.js';
import fs from 'fs-extra';
import os from 'os';

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#0f172a',
            symbolColor: '#ffffff',
        }
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
    return path.join(process.env.APPDATA, 'Firestorm_x64');
});
