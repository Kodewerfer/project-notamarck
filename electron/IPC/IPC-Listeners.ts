// Bind to ipMain.on, one-way communications
import { IPCActions } from './IPC-Actions.ts';
import { GetOpenedFiles } from '../Storage/Globals.ts';
import { BrowserWindow } from 'electron';

/**
 *  On trigger, push opened files to renderer through OPENED_FILES_CHANGED
 */
// push channel
const { OPENED_FILES_CHANGED } = IPCActions.DATA.PUSH;
//receiving channel
const { PUSH_ALL_OPENED_FILES } = IPCActions.DATA;

function PushOpenedFiles() {
  const OpenedFilesData = GetOpenedFiles();

  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send(OPENED_FILES_CHANGED, OpenedFilesData);

  return;
}

// Bind to ipcMain.handle, one-way communications
export const IPCListenerMappings = [{ trigger: PUSH_ALL_OPENED_FILES, listener: PushOpenedFiles }];
