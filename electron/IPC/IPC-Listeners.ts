// Bind to ipMain.on, one-way communications
import { IPCActions } from './IPC-Actions.ts';
import { FindInOpenedFilesByFullPath, GetOpenedFiles, TOpenedFiles, UpdateOpenedFile } from '../Storage/Globals.ts';
import { BrowserWindow } from 'electron';
import IpcMainEvent = Electron.IpcMainEvent;

/**
 *  On trigger, push opened files to renderer through OPENED_FILES_CHANGED
 */

//receiving channel
const { PUSH_ALL_OPENED_FILES } = IPCActions.DATA;
// push channel
const { OPENED_FILES_CHANGED } = IPCActions.DATA.PUSH;

function PushOpenedFiles() {
  const OpenedFilesData = GetOpenedFiles();

  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send(OPENED_FILES_CHANGED, OpenedFilesData);

  return;
}

/**
 *  On trigger, receive the new content and push to renderer again
 */

//receiving channel
const { CHANGE_FILE_CONTENT } = IPCActions.FILES;
// Push channel
const { FILE_CONTENT_CHANGED } = IPCActions.FILES.PUSH;

export type TChangedFilesPayload = {
  TargetFilePath: string;
  NewFile: TOpenedFiles;
};

function OnFileContentChanged(_event: IpcMainEvent, FileFullPath: string, FileContent: string) {
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
  focusedWindow?.webContents.send(FILE_CONTENT_CHANGED, RendererPayload);

  return;
}

// Bind to ipcMain.handle, one-way communications
export const IPCListenerMappings = [
  {
    trigger: PUSH_ALL_OPENED_FILES,
    listener: PushOpenedFiles,
  },
  { trigger: CHANGE_FILE_CONTENT, listener: OnFileContentChanged },
];
