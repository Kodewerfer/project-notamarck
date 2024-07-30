// Bind to ipMain.on, one-way communications
import { IPCActions } from './IPC-Actions.ts';
import {
  ChangeActiveFile,
  FindInOpenedFilesByFullPath,
  GetActiveFile,
  GetOpenedFiles,
  RemoveOpenedFile,
  SetSearchTargetCache,
  UpdateOpenedFile,
} from '../Storage/Globals.ts';
import { BrowserWindow, Menu } from 'electron';
import IpcMainEvent = Electron.IpcMainEvent;
import { UnlinkFile } from '../Utils/FileOperations.ts';
import { ReassignActiveFile } from '../Utils/InternalData.ts';
import { ShowConfirmAlert } from '../Utils/ErrorsAndPrompts.ts';
import { TFileInMemory, TSearchTarget } from "electron-src/Types/GlobalStorage.ts";

/************
 * - MENU -
 ************/
const { SHOW_FILE_OPERATION_MENU } = IPCActions.MENU; //receiving channel
// Pushing channels: multiple, check code
function ShowFileOperationMenu(_event: IpcMainEvent, selectedFiles: string[]) {
  // console.log('context args:', JSON.stringify(selectedFiles));
  const menu = Menu.buildFromTemplate([
    {
      label: 'Delete',
      click: () => {
        let deletedCount = 0;
        let activeFileChanged = false;

        const confirmAlert = ShowConfirmAlert(
          `About to delete ${selectedFiles.length} files, continue?`,
          'This action cannot be reverted.',
        );
        if (confirmAlert === 1) return;
        selectedFiles.forEach(filePath => {
          try {
            if (RemoveOpenedFile(filePath)) deletedCount += 1;
            if (GetActiveFile()?.fullPath === filePath) {
              ReassignActiveFile();
              activeFileChanged = true;
            }
            UnlinkFile(filePath);
          } catch (e) {
            console.error(e);
          }

          if (deletedCount > 0) _event.sender.send(IPCActions.DATA.PUSH.OPENED_FILES_CHANGED, GetOpenedFiles());

          if (activeFileChanged) _event.sender.send(IPCActions.DATA.PUSH.ACTIVE_FILE_CHANGED, GetActiveFile());

          _event.sender.send(IPCActions.FILES.SIGNAL.MD_LIST_CHANGED);
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Rename',
      click: () => {
        const renamingTarget = selectedFiles.length > 1 ? selectedFiles[length - 1] : selectedFiles[0];
        // const fileInMemo = FindInOpenedFilesByFullPath(renamingTarget);

        // if (!fileInMemo.length) return ShowErrorAlert(`Renaming File ${renamingTarget} is not being operated.`);

        _event.sender.send(IPCActions.FILES.PUSH.RENAMING_TARGET_FILE, renamingTarget);
      },
    },
  ]);

  // const focusedWindow = BrowserWindow.getFocusedWindow(); //same result
  const senderWindow = BrowserWindow.fromWebContents(_event.sender);
  if (senderWindow) menu.popup({ window: senderWindow });
}

/************
 * - DATA -
 ************/

const { PUSH_ALL_OPENED_FILES } = IPCActions.DATA; //receiving channel

// On trigger, push opened files to renderer through OPENED_FILES_CHANGED
function PushOpenedFiles() {
  const OpenedFilesData = GetOpenedFiles();

  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send(IPCActions.DATA.PUSH.OPENED_FILES_CHANGED, OpenedFilesData);

  return;
}

const { UPDATE_OPENED_FILE_CONTENT } = IPCActions.DATA; //receiving channel

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
  focusedWindow?.webContents.send(IPCActions.DATA.PUSH.OPENED_FILE_CONTENT_CHANGED, RendererPayload);

  return;
}

const { CHANGE_ACTIVE_FILE } = IPCActions.DATA; // Receiving
function ChangeActiveFileAndPush(_event: IpcMainEvent, NewTargetFile: TFileInMemory) {
  ChangeActiveFile(NewTargetFile);
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send(IPCActions.DATA.PUSH.ACTIVE_FILE_CHANGED, GetActiveFile());
}

const { SET_NEW_SEARCH_TARGET } = IPCActions.DATA; // Receiving
function SetNewSearchAndPush(_event: IpcMainEvent, NewSearch: TSearchTarget) {
  if (!NewSearch) return;

  // cache the search
  SetSearchTargetCache(NewSearch);

  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send(IPCActions.DATA.PUSH.BEGIN_NEW_SEARCH, { ...NewSearch });
}

// Bind to ipcMain.handle, one-way communications
export const IPCListenerMappings = [
  {
    trigger: PUSH_ALL_OPENED_FILES,
    listener: PushOpenedFiles,
  },
  { trigger: UPDATE_OPENED_FILE_CONTENT, listener: UpdateFileContentAndPush },
  { trigger: CHANGE_ACTIVE_FILE, listener: ChangeActiveFileAndPush },
  { trigger: SHOW_FILE_OPERATION_MENU, listener: ShowFileOperationMenu },
  { trigger: SET_NEW_SEARCH_TARGET, listener: SetNewSearchAndPush },
];
