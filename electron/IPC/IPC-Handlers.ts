import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FormatFileSize } from '../Helper.ts';
import { IPCActions } from './IPC-Actions.ts';
import { app, BrowserWindow, dialog } from 'electron';
import {
  AddToOpenedFiles,
  AddToRecentWorkspace,
  ChangeWorkspace,
  GetOpenedFiles,
  GetRecentWorkspace,
  GetCurrentWorkspace,
  RemoveAllOpenFiles,
  RemoveOpenedFile,
  TOpenedFiles,
  SyncWorkspaceAndRecents,
  GetActiveFile,
} from '../Storage/Globals.ts';

/**
 * Output the path where the app is located.
 */
const { GET_APP_PATH } = IPCActions.APP;

export function GetAppPath() {
  return app.getAppPath();
}

/**
 * List all files or directories in the given path
 */
const { LIST_CURRENT_PATH } = IPCActions.FILES;

export type TListedFile = ReturnType<typeof ListAllFiles>[0];

export function ListAllFiles(_Event: IpcMainInvokeEvent, targetPath: string) {
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

export type TMDFile = ReturnType<typeof ListAllMD>[0];

export function ListAllMD(_Event: IpcMainInvokeEvent, targetPath: string) {
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

export function ShowDialogDIR(_Event: IpcMainInvokeEvent) {
  const dialogReturn = dialog.showOpenDialogSync({
    properties: ['openDirectory'],
  });
  return dialogReturn;
}

/**
 * Read a MD file from path, add to opened file and push to renderer
 */
const { READ_MD_PATH } = IPCActions.FILES;
const { OPENED_FILES_CHANGED } = IPCActions.DATA.PUSH;

export function ReadMDAndPushOpenedFiles(_Event: IpcMainInvokeEvent, targetPath: string) {
  if (!targetPath.endsWith('.md')) throw new Error(`${targetPath} file is not MD`);

  try {
    let MDFileContent = fs.readFileSync(targetPath, { encoding: 'utf8' });
    const MDFileInfo = {
      fullPath: targetPath,
      filename: path.basename(targetPath),
      content: MDFileContent,
    };
    AddToOpenedFiles(MDFileInfo);

    // push to the current window
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const OpenedFilesData = GetOpenedFiles();
    focusedWindow?.webContents.send(OPENED_FILES_CHANGED, OpenedFilesData);
    return MDFileInfo;
  } catch (e) {
    throw e;
  }
}

/**
 * Return all opened files to renderer
 */
const { GET_ALL_OPENED_FILES } = IPCActions.DATA;

export function GetAllOpenedFiles(_Event: IpcMainInvokeEvent) {
  return GetOpenedFiles();
}

/**
 * Close an opened file
 */
const { CLOSE_OPENED_FILES } = IPCActions.DATA;

export function CloseOpenedFile(_Event: IpcMainInvokeEvent, FilesItems: TOpenedFiles | TOpenedFiles[]) {
  if (!FilesItems) return;

  if (!Array.isArray(FilesItems)) {
    FilesItems = [FilesItems];
  }

  FilesItems.forEach(item => {
    RemoveOpenedFile(item);
  });

  // TODO: do the saving in the renderer

  const focusedWindow = BrowserWindow.getFocusedWindow();
  const OpenedFilesData = GetOpenedFiles();
  focusedWindow?.webContents.send(OPENED_FILES_CHANGED, OpenedFilesData);
}

/**
 * Save the current active file, return true or false, can throw
 */
const { SAVE_ACTIVE_FILE } = IPCActions.FILES;

export function SaveCurrentActiveFile() {
  const ActiveFile = GetActiveFile();
  if (!ActiveFile) return new Error(`Failed to write: No active file`);
  if (!ActiveFile.content) return new Error(`Failed to write: Active File no content`);
  try {
    fs.writeFileSync(ActiveFile.fullPath, ActiveFile.content, { encoding: 'utf8' });
  } catch (e) {
    throw new Error(`Failed to write: ${ActiveFile.fullPath}`);
  }
}

/**
 * Save all opened files,return true or false, can throw
 */
const { SAVE_ALL_FILES } = IPCActions.FILES;

export function SaveAllOpenedFiles() {
  let ErrorsInWriting: string[] = [];
  GetOpenedFiles().forEach(item => {
    if (!item.fullPath || !item.content) return;
    try {
      fs.writeFileSync(item.fullPath, item.content, { encoding: 'utf8' });
    } catch (e) {
      ErrorsInWriting.push(item.fullPath);
    }
  });
  if (ErrorsInWriting.length) throw new Error(`Failed to write files: ${ErrorsInWriting}`);
}

/**
 * Save a file to disk, don't need to be in the opened files, return true or false, can throw
 */
const { SAVE_TARGET_FILE } = IPCActions.FILES;

export function SaveTargetFile(_Event: IpcMainInvokeEvent, targetFile: TOpenedFiles) {
  if (!targetFile.fullPath || targetFile.fullPath === '' || !targetFile.content)
    throw new Error(`Failed to write: ${targetFile} has no full-path or content`);
  try {
    fs.writeFileSync(targetFile.fullPath, targetFile.content, { encoding: 'utf8' });
  } catch (e) {
    throw new Error(`Failed to write: ${targetFile.fullPath}`);
  }
}

/**
 * Get and set work space
 */
const { GET_WORK_SPACE } = IPCActions.APP;

export function ReturnCurrentWorkspace() {
  return GetCurrentWorkspace();
}

/**
 * Return currently active folder
 */
const { GET_RECENT_WORK_SPACES } = IPCActions.APP;

export function ReturnRecentWorkspaces() {
  return GetRecentWorkspace();
}

/**
 * Change the active folder, save all files from the previous folder
 */
// Receiving channel
const { SET_WORK_SPACE } = IPCActions.APP;
// Push channels
const { WORK_SPACE_CHANGED } = IPCActions.APP.PUSH;
const { RECENT_WORK_SPACES_CHANGED } = IPCActions.APP.PUSH;

export function ValidateAndChangeWorkspace(_Event: IpcMainInvokeEvent, NewDirPath: string) {
  try {
    path.resolve(NewDirPath);
  } catch (e) {
    throw new Error(`Invalid directory path: ${NewDirPath}`);
  }
  try {
    fs.existsSync(path.resolve(NewDirPath));
  } catch (e) {
    throw new Error(`Dir does not exist: ${NewDirPath}`);
  }

  // TODO: do the saving in the renderer

  // close all opened files in the last folder
  RemoveAllOpenFiles();

  // change workspace and add old to recent
  const oldDIrPath = ChangeWorkspace(NewDirPath);
  if (oldDIrPath === null) return; // new path is the same as the last one

  console.log('Setting workspace to :', NewDirPath);
  // push to renderer
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send(WORK_SPACE_CHANGED, GetCurrentWorkspace());

  // add to recent workspace
  if (oldDIrPath.trim() !== '') {
    AddToRecentWorkspace(oldDIrPath);
    SyncWorkspaceAndRecents();
    focusedWindow?.webContents.send(RECENT_WORK_SPACES_CHANGED, GetRecentWorkspace());
  }
}

/**
 * Bind to ipcMain.handle, two-way communications
 */
export const IPCHandlerMappings = [
  { trigger: GET_APP_PATH, handler: GetAppPath },
  { trigger: LIST_CURRENT_PATH, handler: ListAllFiles },
  { trigger: LIST_CURRENT_PATH_MD, handler: ListAllMD },
  { trigger: READ_MD_PATH, handler: ReadMDAndPushOpenedFiles },
  { trigger: GET_ALL_OPENED_FILES, handler: GetAllOpenedFiles },
  { trigger: CLOSE_OPENED_FILES, handler: CloseOpenedFile },
  { trigger: SHOW_SELECTION_DIR, handler: ShowDialogDIR },
  { trigger: GET_WORK_SPACE, handler: ReturnCurrentWorkspace },
  { trigger: GET_RECENT_WORK_SPACES, handler: ReturnRecentWorkspaces },
  { trigger: SET_WORK_SPACE, handler: ValidateAndChangeWorkspace },
  { trigger: SAVE_ACTIVE_FILE, handler: SaveCurrentActiveFile },
  { trigger: SAVE_ALL_FILES, handler: SaveAllOpenedFiles },
  { trigger: SAVE_TARGET_FILE, handler: SaveTargetFile },
];
