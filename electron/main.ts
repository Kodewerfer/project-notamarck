import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { IPCHandlerMappings } from './IPC/IPC-Handlers.ts';
import { IPCListenerMappings } from './IPC/IPC-Listeners.ts';
import {
  SetCurrentWorkspaceThenStore,
  SetAppMainWindowID,
  SetRecentWorkSpace,
  GetAppMainWindowID,
  GetConfigStore,
  InitConfigStore,
} from './Data/Globals.ts';
import * as fs from 'node:fs';
import { ResetAndCacheTagsListAsync } from './Utils/TagOperations.ts';
import { ResetAndCacheMDFilesListAsync } from './Utils/FileOperations.ts';
import { AppData_Keys } from './Data/Persistence.ts';
import StartFilesWatcher from './FSMonitor/FilesWatcher.ts';
import StartTagsWatcher from './FSMonitor/TagsWatcher.ts';
import { SetUpGlobalShortCuts, UnregisterGlobalShortcuts } from './Utils/GlobalShortcuts.ts';
import log from 'electron-log';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    title: 'Project Notamarck',
    autoHideMenuBar: true,
    icon: path.join(process.env.VITE_PUBLIC, 'Notamarck-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
    },
  });

  win.setMenu(
    Menu.buildFromTemplate([
      {
        label: 'App',
        submenu: [{ role: 'quit' }],
      },
      {
        label: 'View',
        submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'togglefullscreen' }],
      },
      {
        label: 'Dev',
        submenu: [{ role: 'toggleDevTools' }],
      },
    ]),
  );

  // cache the ID for later use
  SetAppMainWindowID(win.id);

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(_ => {
  // bind IPC
  IPCHandlerMappings.forEach(IPC => {
    ipcMain.handle(IPC.trigger, IPC.handler);
  });

  IPCListenerMappings.forEach(IPC => {
    ipcMain.on(IPC.trigger, IPC.listener);
  });

  InitConfigStore();
  InitWorkspace();

  // Cache the file list of both tags and main workspace MDs
  ResetAndCacheTagsListAsync();
  ResetAndCacheMDFilesListAsync();

  // create window
  createWindow();

  StartFilesWatcher();
  StartTagsWatcher();

  BrowserWindow.fromId(GetAppMainWindowID())?.on('focus', () => {
    SetUpGlobalShortCuts();
  });

  BrowserWindow.fromId(GetAppMainWindowID())?.on('blur', () => {
    UnregisterGlobalShortcuts();
  });

  log.log('App launched');
});

// Init a default "workspace" folder under the app root
function InitWorkspace() {
  const store = GetConfigStore();
  // try to get the workspace from last time
  let storedPath = '';
  if (store) storedPath = String(store.get(AppData_Keys.currentWorkspace));
  try {
    fs.accessSync(storedPath);
    SetCurrentWorkspaceThenStore(storedPath);
  } catch (e) {
    //   problem accessing the workspace
    console.log('Workspace cannot be accessed, defaulting to AppFolder');
    log.log('Workspace cannot be accessed, defaulting to AppFolder');
    try {
      const DefaultWorkSpace = path.join(app.getPath('userData'), 'DefaultWorkSpace');
      if (!fs.existsSync(DefaultWorkSpace)) fs.mkdirSync(DefaultWorkSpace);
      SetCurrentWorkspaceThenStore(DefaultWorkSpace);
    } catch (e) {
      console.log('error creating default workspace directory,', e);
      log.error('error creating default workspace directory,', e);
    }
  }

  //   get recent workspace from store
  if (store) {
    const storedRecents = (store.get(AppData_Keys.recentWorkspace) as string[]) || [];

    if (storedRecents.length) SetRecentWorkSpace(storedRecents);
  }
}
