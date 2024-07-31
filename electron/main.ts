import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { IPCHandlerMappings } from './IPC/IPC-Handlers.ts';
import { IPCListenerMappings } from './IPC/IPC-Listeners.ts';
import { GetAppMainWindowID, GetCurrentWorkspace, SetAppMainWindowID } from './Storage/Globals.ts';
import * as fs from 'node:fs';
import { FetchAllTagsAsync } from './Utils/TagOperations.ts';
import { TTagsInMemory } from './Types/Tags.ts';
import { SetTagMap } from './Storage/Tags.ts';
import { IPCActions } from './IPC/IPC-Actions.ts';
import StartTagsWatcher from './FSMonitor/TagsWatcher.ts';

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
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      // nodeIntegration: true
    },
  });

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

  // TODO: after adding app config with file persistence, load previous workspace info here

  InitDefaultFolder();

  InitAllTagsAsync();

  // create window
  createWindow();

  // Setup Fs monitoring
  StartTagsWatcher();
});

// Init a default "workspace" folder under the app root
function InitDefaultFolder() {
  const currentWorkspace = GetCurrentWorkspace();
  if (!fs.existsSync(currentWorkspace)) {
    console.log('Defualt fallback workspace does not exist, creating one');
    try {
      fs.mkdirSync(currentWorkspace);
    } catch (e) {
      console.log('error creating default workspace directory,', e);
    }
  }
}

async function InitAllTagsAsync() {
  const allTags = await FetchAllTagsAsync();
  if (!allTags || !allTags.length) return;

  allTags.forEach((tag: TTagsInMemory) => {
    SetTagMap(tag);
  });

  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.FILES.SIGNAL.TAG_LIST_CHANGED);
}
