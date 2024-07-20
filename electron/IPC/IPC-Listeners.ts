// Bind to ipMain.on, one-way communications
import { IPCActions } from './IPC-Actions.ts';
import {
  ChangeActiveFile,
  FindInOpenedFilesByFullPath,
  GetActiveFile,
  GetOpenedFiles,
  TFileInMemory,
  UpdateOpenedFile,
} from '../Storage/Globals.ts';
import { BrowserWindow } from 'electron';
import IpcMainEvent = Electron.IpcMainEvent;

/************
 * - DATA -
 ************/

const { PUSH_ALL_OPENED_FILES } = IPCActions.DATA; //receiving channel
const { OPENED_FILES_CHANGED } = IPCActions.DATA.PUSH; // push channel

// On trigger, push opened files to renderer through OPENED_FILES_CHANGED
function PushOpenedFiles() {
  const OpenedFilesData = GetOpenedFiles();

  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send(OPENED_FILES_CHANGED, OpenedFilesData);

  return;
}

const { UPDATE_OPENED_FILE_CONTENT } = IPCActions.DATA; //receiving channel
const { OPENED_FILE_CONTENT_CHANGED } = IPCActions.DATA.PUSH; // Push channel

export type TChangedFilesPayload = {
  TargetFilePath: string;
  NewFile: TFileInMemory;
};

// On trigger, receive the new content and push to renderer again
function UpdateFileContentAndPush(_event: IpcMainEvent, FileFullPath: string, FileContent: string) {
  const targetFileResults = FindInOpenedFilesByFullPath(FileFullPath);
  if (!targetFileResults.length) return;
  let targetFileCache = targetFileResults[0]; //only change the first one it there're multiple(very unlikely)
  targetFileCache.content = String(FileContent);
  UpdateOpenedFile(FileFullPath, targetFileCache);

  const RendererPayload: TChangedFilesPayload[] = [
    {
      TargetFilePath: FileFullPath,
      NewFile: targetFileCache,
    },
  ];
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send(OPENED_FILE_CONTENT_CHANGED, RendererPayload);

  return;
}

const { CHANGE_ACTIVE_FILE } = IPCActions.DATA; // Receiving
const { ACTIVE_FILE_CHANGED } = IPCActions.DATA.PUSH; // Pushing
// Change the file marked as editing, push to renderer
function ChangeActiveFileAndPush(_event: IpcMainEvent, NewTargetFile: TFileInMemory) {
  ChangeActiveFile(NewTargetFile);
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send(ACTIVE_FILE_CHANGED, GetActiveFile());
}

// Bind to ipcMain.handle, one-way communications
export const IPCListenerMappings = [
  {
    trigger: PUSH_ALL_OPENED_FILES,
    listener: PushOpenedFiles,
  },
  { trigger: UPDATE_OPENED_FILE_CONTENT, listener: UpdateFileContentAndPush },
  { trigger: CHANGE_ACTIVE_FILE, listener: ChangeActiveFileAndPush },
];
