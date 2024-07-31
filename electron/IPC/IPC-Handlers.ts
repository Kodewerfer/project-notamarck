import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FormatFileSize } from '../Helper.ts';
import { IPCActions } from './IPC-Actions.ts';
import { app, BrowserWindow, dialog } from 'electron';
import {
  AddToRecentWorkspace,
  ChangeActiveFile,
  ChangeWorkspace,
  FindInOpenedFilesByFullPath,
  GetActiveFile,
  GetCurrentWorkspace,
  GetOpenedFiles,
  GetRecentWorkspace,
  GetSelectionStatusCache,
  RemoveAllOpenFiles,
  RemoveOpenedFile,
  SetMDFilesList,
  SetSelectionStatusCache,
  SyncWorkspaceAndRecents,
} from '../Storage/Globals.ts';
import MessageBoxSyncOptions = Electron.MessageBoxSyncOptions;
import { ReadMDAndAddToOpenedFile, RenameFileKeepDup, SaveContentToFileRenameOnDup } from '../Utils/FileOperations.ts';
import { ReassignActiveFile } from '../Utils/InternalData.ts';
import { TFileInMemory } from '../Types/GlobalStorage.ts';
import { ListAllTags, SaveTagFileRenameOnDup } from '../Utils/TagOperations.ts';
import { SetTagList } from '../Storage/Tags.ts';

/************
 * - APP -
 ************/

// Output the path where the app is located.
const { GET_APP_PATH } = IPCActions.APP;

export function GetAppPath() {
  return app.getAppPath();
}

// Get and set work space
const { GET_WORK_SPACE } = IPCActions.APP;

export function ReturnCurrentWorkspace() {
  return GetCurrentWorkspace();
}

// Return currently active folder
const { GET_RECENT_WORK_SPACES } = IPCActions.APP;

export function ReturnRecentWorkspaces() {
  return GetRecentWorkspace();
}

// Change the active folder, save all files from the previous folder
// Receiving channel
const { SET_WORK_SPACE } = IPCActions.APP;

export function ValidateAndChangeWorkspaceThenPush(_Event: IpcMainInvokeEvent, NewDirPath: string) {
  try {
    path.resolve(NewDirPath);
  } catch (e) {
    throw new Error(`Invalid directory path: ${NewDirPath}`);
  }

  if (!fs.existsSync(path.resolve(NewDirPath))) throw new Error(`Dir does not exist: ${NewDirPath}`);

  // TODO: do the saving in the renderer
  // change workspace and add old to recent
  const oldDIrPath = ChangeWorkspace(NewDirPath);
  if (oldDIrPath === null) return; // new path is the same as the last one

  console.log('Setting workspace to :', NewDirPath);
  // push to renderer
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send(IPCActions.APP.PUSH.WORK_SPACE_CHANGED, GetCurrentWorkspace());

  // add to recent workspace
  if (oldDIrPath.trim() !== '') {
    AddToRecentWorkspace(oldDIrPath);
    SyncWorkspaceAndRecents();
    focusedWindow?.webContents.send(IPCActions.APP.PUSH.RECENT_WORK_SPACES_CHANGED, GetRecentWorkspace());
  }
}

/************
 * - DIALOG -
 ***********/

// Show dialog for path selection
const { SHOW_SELECTION_DIR } = IPCActions.DIALOG;

export function ShowDialogDIR(_Event: IpcMainInvokeEvent) {
  const dialogReturn = dialog.showOpenDialogSync({
    properties: ['openDirectory'],
  });
  return dialogReturn;
}

const { SHOW_MESSAGE_DIALOG } = IPCActions.DIALOG;

export function ShowDialogMessage(_Event: IpcMainInvokeEvent, Message: MessageBoxSyncOptions) {
  return dialog.showMessageBoxSync({ ...Message });
}

/************
 * - DATA -
 ************/

// Close an opened file or an array
const { GET_ALL_OPENED_FILES } = IPCActions.DATA;

export function GetAllOpenedFiles(_Event: IpcMainInvokeEvent) {
  return GetOpenedFiles();
}

// Close an opened file or an array
const { CLOSE_TARGET_OPENED_FILES } = IPCActions.DATA;

export function CloseOpenedFile(_Event: IpcMainInvokeEvent, FilesItems: TFileInMemory | TFileInMemory[]) {
  if (!FilesItems) return;

  if (!Array.isArray(FilesItems)) {
    FilesItems = [FilesItems];
  }

  let deleteCount = 0;
  let activeFileChanged = false;
  FilesItems.forEach(item => {
    if (RemoveOpenedFile(item)) deleteCount += 1;
    if (GetActiveFile()?.fullPath === item.fullPath) {
      ReassignActiveFile();
      activeFileChanged = true;
    }
  });

  if (deleteCount == 0) return;

  const focusedWindow = BrowserWindow.getFocusedWindow();
  const OpenedFilesData = GetOpenedFiles();
  focusedWindow?.webContents.send(IPCActions.DATA.PUSH.OPENED_FILES_CHANGED, OpenedFilesData);
  if (activeFileChanged) focusedWindow?.webContents.send(IPCActions.DATA.PUSH.ACTIVE_FILE_CHANGED, GetActiveFile());
}

// Close All opened files
const { CLOSE_ALL_OPENED_FILES } = IPCActions.DATA;

export function CloseAllOpenedFiles(_Event: IpcMainInvokeEvent) {
  // close all opened files in the last folder
  RemoveAllOpenFiles();
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const OpenedFilesData = GetOpenedFiles();
  focusedWindow?.webContents.send(IPCActions.DATA.PUSH.OPENED_FILES_CHANGED, OpenedFilesData);
}

const { GET_SELECTION_STATUS_CACHE } = IPCActions.DATA;

export function ReturnSelectionStatusForPath(_Event: IpcMainInvokeEvent, fullPath: string) {
  return GetSelectionStatusCache(fullPath);
}

const { UPDATE_SELECTION_STATUS_CACHE } = IPCActions.DATA;

export function SetSelectionStatusForPath(_Event: IpcMainInvokeEvent, fullPath: string, status: Object) {
  return SetSelectionStatusCache(fullPath, status);
}

// Save the current active file, return true or false, can throw
const { SAVE_ACTIVE_FILE } = IPCActions.DATA;

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

// Save all opened files,return true or false, can throw
const { SAVE_ALL_OPENED_FILES } = IPCActions.DATA;

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

// Save a file to disk,  return true or false, can throw
const { SAVE_TARGET_OPENED_FILE } = IPCActions.DATA;

export function SaveTargetFileBaseOnPath(_Event: IpcMainInvokeEvent, targetFileFullPath: string) {
  if (!targetFileFullPath || String(targetFileFullPath) !== targetFileFullPath)
    throw new Error(`Failed to write: Invalid target file full path`);

  let resultFiles = FindInOpenedFilesByFullPath(targetFileFullPath);

  if (!resultFiles || !resultFiles.length)
    throw new Error(`Failed to write: ${targetFileFullPath} has not been operated.`);

  const targetFile = resultFiles[0];
  if (!targetFile) throw new Error(`Failed to write: ${targetFileFullPath} has not been operated.`);

  if (!targetFile.fullPath || targetFile.fullPath === '')
    throw new Error(`Failed to write: ${targetFile} has no full-path or content`);
  try {
    fs.writeFileSync(targetFile.fullPath, targetFile.content ?? '', { encoding: 'utf8' });
  } catch (e) {
    throw new Error(`Failed to write: ${targetFile.fullPath}`);
  }
  console.log('File Saved:', targetFile.fullPath);
}

/************
 * - FILES -
 ************/

// List all files or directories in the given path
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

// List all MD files from a path
const { LIST_CURRENT_PATH_MD } = IPCActions.FILES;
export type TMDFile = ReturnType<typeof ReturnAllMDsInPath>[0];

export function ReturnAllMDsInPath(_Event: IpcMainInvokeEvent, targetPath: string) {
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

  // store the list in memory
  SetMDFilesList(MDFiles);

  return MDFiles;
}

// Read a MD file from path, add to opened file and push to renderer
const { READ_MD_FROM_PATH } = IPCActions.FILES;

export function ReadMDAndPushOpenedFiles(_Event: IpcMainInvokeEvent, targetPath: string) {
  if (!targetPath.endsWith('.md')) throw new Error(`${targetPath} file is not MD`);

  try {
    const MDFileInfo = ReadMDAndAddToOpenedFile(targetPath);
    // push to the current window
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const OpenedFilesData = GetOpenedFiles();
    focusedWindow?.webContents.send(IPCActions.DATA.PUSH.OPENED_FILES_CHANGED, OpenedFilesData);
    return MDFileInfo;
  } catch (e) {
    throw e;
  }
}

// - MD Files

const { CREATE_NEW_FILE } = IPCActions.FILES; //receiving
// Create a new empty file at target location
export function CreateNewFileAndSendSignal(_Event: IpcMainInvokeEvent, FileFullName: string, FileContent?: string) {
  try {
    path.resolve(FileFullName);
  } catch (e) {
    throw new Error(`${FileFullName} is not valid`);
  }

  SaveContentToFileRenameOnDup(FileFullName, FileContent);

  // push to the current window as a signal
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send(IPCActions.FILES.SIGNAL.MD_LIST_CHANGED);
}

const { CHANGE_TARGET_FILE_NAME } = IPCActions.FILES;

export function ChangeTargetFileToNewNameAndSignal(
  _Event: IpcMainInvokeEvent,
  OldFilePath: string,
  NewFileName: string,
) {
  // check if renaming active file
  let bInActiveFile = false;
  if (GetActiveFile()?.fullPath === OldFilePath) {
    ReassignActiveFile();
    bInActiveFile = true;
  }
  // check if renaming an opened file
  let bInOpenedFile = false;
  const openedFileRecord = FindInOpenedFilesByFullPath(OldFilePath)[0];
  if (openedFileRecord) {
    RemoveOpenedFile(OldFilePath);
    bInOpenedFile = true;
  }

  try {
    const newFilePath = RenameFileKeepDup(OldFilePath, NewFileName);
    let newOpenedFile;
    //re-open the file if need be
    if (bInOpenedFile) newOpenedFile = ReadMDAndAddToOpenedFile(newFilePath);
    if (bInActiveFile && newOpenedFile) ChangeActiveFile(newOpenedFile);
  } catch (e) {
    throw e;
  }

  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (bInActiveFile) focusedWindow?.webContents.send(IPCActions.DATA.PUSH.ACTIVE_FILE_CHANGED, GetActiveFile());
  if (bInOpenedFile) focusedWindow?.webContents.send(IPCActions.DATA.PUSH.OPENED_FILES_CHANGED, GetOpenedFiles());
  focusedWindow?.webContents.send(IPCActions.FILES.SIGNAL.MD_LIST_CHANGED);
}

// - Tags
const { CREATE_NEW_TAG } = IPCActions.FILES; //receiving
// Create a new empty tag at tag folder
export function CreateNewTagAndSendSignal(_Event: IpcMainInvokeEvent, TagFileName: string) {
  try {
    path.resolve(TagFileName);
  } catch (e) {
    throw new Error(`${TagFileName} is not valid`);
  }

  SaveTagFileRenameOnDup(TagFileName);

  // push to the current window as a signal
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send(IPCActions.FILES.SIGNAL.TAG_LIST_CHANGED);
}

const { LIST_ALL_TAGS } = IPCActions.FILES; //receiving

export function ReturnAllTags() {
  const allTags = ListAllTags();

  if (!allTags || allTags.length === 0) return;

  SetTagList(allTags);

  return allTags;
}

/**
 * Bind to ipcMain.handle, two-way communications
 */
export const IPCHandlerMappings = [
  { trigger: GET_APP_PATH, handler: GetAppPath },
  { trigger: LIST_CURRENT_PATH, handler: ListAllFiles },
  { trigger: LIST_CURRENT_PATH_MD, handler: ReturnAllMDsInPath },
  { trigger: READ_MD_FROM_PATH, handler: ReadMDAndPushOpenedFiles },
  { trigger: GET_ALL_OPENED_FILES, handler: GetAllOpenedFiles },
  { trigger: CLOSE_TARGET_OPENED_FILES, handler: CloseOpenedFile },
  { trigger: SHOW_SELECTION_DIR, handler: ShowDialogDIR },
  { trigger: GET_WORK_SPACE, handler: ReturnCurrentWorkspace },
  { trigger: GET_RECENT_WORK_SPACES, handler: ReturnRecentWorkspaces },
  { trigger: SET_WORK_SPACE, handler: ValidateAndChangeWorkspaceThenPush },
  { trigger: SAVE_ACTIVE_FILE, handler: SaveCurrentActiveFile },
  { trigger: SAVE_ALL_OPENED_FILES, handler: SaveAllOpenedFiles },
  { trigger: SAVE_TARGET_OPENED_FILE, handler: SaveTargetFileBaseOnPath },
  { trigger: CLOSE_ALL_OPENED_FILES, handler: CloseAllOpenedFiles },
  { trigger: SHOW_MESSAGE_DIALOG, handler: ShowDialogMessage },
  { trigger: CREATE_NEW_FILE, handler: CreateNewFileAndSendSignal },
  { trigger: GET_SELECTION_STATUS_CACHE, handler: ReturnSelectionStatusForPath },
  { trigger: UPDATE_SELECTION_STATUS_CACHE, handler: SetSelectionStatusForPath },
  { trigger: CHANGE_TARGET_FILE_NAME, handler: ChangeTargetFileToNewNameAndSignal },
  { trigger: CREATE_NEW_TAG, handler: CreateNewTagAndSendSignal },
  { trigger: LIST_ALL_TAGS, handler: ReturnAllTags },
];
