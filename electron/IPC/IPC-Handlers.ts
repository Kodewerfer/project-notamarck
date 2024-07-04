import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FormatFileSize } from '../Helper.ts';
import { IPCActions } from './IPC-Actions.ts';
import { app, dialog } from 'electron';

/**
 * Output the path where the app is located.
 */
const { GET_APP_PATH } = IPCActions.APP;

export function HandleGetAppPath() {
  return app.getAppPath();
}

/**
 * List all files or directories in the given path
 */
const { LIST_CURRENT_PATH } = IPCActions.FILES;

export type TListedFile = ReturnType<typeof HandleListFiles>[0];

export function HandleListFiles(
  _Event: IpcMainInvokeEvent,
  targetPath: string,
) {
  const files = fs
    .readdirSync(targetPath)
    .map(file => {
      const fileStats = fs.statSync(path.join(targetPath, file));
      return {
        name: file,
        size: fileStats.isFile() ? FormatFileSize(fileStats.size ?? 0) : null,
        directory: fileStats.isDirectory(),
      };
    })
    .sort((a, b) => {
      if (a.directory === b.directory) {
        return a.name.localeCompare(b.name);
      }
      return a.directory ? -1 : 1;
    });

  return files;
}

/**
 * List all MD files from a path
 */
const { LIST_CURRENT_PATH_MD } = IPCActions.FILES;

export type TMDFile = ReturnType<typeof HandleListMD>[0];

export function HandleListMD(_Event: IpcMainInvokeEvent, targetPath: string) {
  const MDFiles = fs
    .readdirSync(targetPath)
    .filter(file => {
      const fileStats = fs.statSync(path.join(targetPath, file));
      return !fileStats.isDirectory() && file.endsWith('.md');
    })
    .map(file => {
      const fileStats = fs.statSync(path.join(targetPath, file));
      return {
        name: file,
        path: path.join(targetPath, file),
        size: fileStats.isFile() ? FormatFileSize(fileStats.size ?? 0) : null,
      };
    });

  return MDFiles;
}

/**
 * Show dialog for path selection
 */
const { SHOW_SELECTION_DIR } = IPCActions.DIALOG;

export function HandleShowDialogDIR(_Event: IpcMainInvokeEvent) {
  const dialogReturn = dialog.showOpenDialogSync({
    properties: ['openDirectory'],
  });
  return dialogReturn;
}

/**
 * Read a MD file from path
 */
const { READ_MD_PATH } = IPCActions.FILES;

export function HandleReadMDFile(
  _Event: IpcMainInvokeEvent,
  targetPath: string,
) {
  // TODO:should be using stream ideally, but too much problem with IPC
  if (!targetPath.endsWith('.md'))
    throw new Error(`${targetPath} file is not MD`);

  try {
    return fs.readFileSync(targetPath, { encoding: 'utf8' });
  } catch (e) {
    throw e;
  }
}

// Bind to ipcMain.handle, two-way communications
export const IPCHandlerMappings = [
  { trigger: GET_APP_PATH, handler: HandleGetAppPath },
  { trigger: LIST_CURRENT_PATH, handler: HandleListFiles },
  { trigger: LIST_CURRENT_PATH_MD, handler: HandleListMD },
  { trigger: READ_MD_PATH, handler: HandleReadMDFile },
  { trigger: SHOW_SELECTION_DIR, handler: HandleShowDialogDIR },
];
