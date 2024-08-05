// Bind to ipMain.on, one-way communications
import { IPCActions } from './IPC-Actions.ts';
import {
  ChangeActiveFile,
  FindInOpenedFilesByFullPath,
  GetActiveFile,
  GetOpenedFiles,
  UpdateOpenedFile,
} from '../Data/Globals.ts';
import { BrowserWindow, Menu } from 'electron';
import IpcMainEvent = Electron.IpcMainEvent;
import { UnlinkFile } from '../Utils/FileOperations.ts';
import { ShowConfirmAlert, ShowErrorAlert } from '../Utils/ErrorsAndPrompts.ts';
import { TFileInMemory } from '../Types/GlobalData.ts';
import { TChangedFilesPayload } from '../Types/IPC.ts';
import { UnlinkTag } from '../Utils/TagOperations.ts';
import { GetAllFilteredData, GetLastSearchTargetToken, SetFilteredData, SetSearchTargetToken } from '../Data/Seach.ts';
import { ESearchTypes, TSearchFilteredData, TSearchTarget } from '../Types/Search.ts';

/************
 * - MENU -
 ************/
const { SHOW_FILE_OPERATION_MENU } = IPCActions.MENU; //receiving channel
// Pushing channels: multiple, check code
function ShowFileOperationMenu(_event: IpcMainEvent, selectedFilesPath: string[]) {
  if (!selectedFilesPath) return;
  const menu = Menu.buildFromTemplate([
    {
      label: 'Rename',
      enabled: selectedFilesPath.length > 0,
      click: () => {
        const renamingTarget = selectedFilesPath.length > 1 ? selectedFilesPath[length - 1] : selectedFilesPath[0];
        _event.sender.send(IPCActions.FILES.PUSH.RENAMING_TARGET_FILE, renamingTarget);
      },
    },
    { type: 'separator' },
    {
      label: 'Delete',
      enabled: selectedFilesPath.length > 0,
      click: () => {
        const confirmAlertResponse = ShowConfirmAlert(
          `About to delete ${selectedFilesPath.length} files, continue?`,
          'This action cannot be reverted.',
        );
        if (confirmAlertResponse === 1) return;
        selectedFilesPath.forEach(filePath => {
          try {
            UnlinkFile(filePath);
          } catch (e) {
            ShowErrorAlert((e as Error).message);
          }
        });
        //NOTE: pushing and signaling will be done in the fileWatcher
      },
    },
  ]);

  const senderWindow = BrowserWindow.fromWebContents(_event.sender);
  if (senderWindow) menu.popup({ window: senderWindow });
}

const { SHOW_TAG_OPERATION_MENU } = IPCActions.MENU; //receiving channel
// Pushing channels: multiple, check code
function ShowTagOperationMenu(_event: IpcMainEvent, selectedTagsPath: string[]) {
  if (!selectedTagsPath) return;
  const menu = Menu.buildFromTemplate([
    {
      label: 'New Tag',
      click: () => {
        const NewFileSearch: TSearchTarget = {
          placeHolder: 'New Tag',
          searchType: ESearchTypes.Tag,
        };
        SetNewSearchAndPush(_event, NewFileSearch);
      },
    },
    { type: 'separator' },
    {
      label: 'Rename',
      enabled: selectedTagsPath.length > 0,
      click: () => {
        const renamingTarget = selectedTagsPath.length > 1 ? selectedTagsPath[length - 1] : selectedTagsPath[0];
        _event.sender.send(IPCActions.FILES.PUSH.RENAMING_SELECTED_TAG, renamingTarget);
      },
    },
    { type: 'separator' },
    {
      label: 'Delete',
      enabled: selectedTagsPath.length > 0,
      click: () => {
        const confirmAlertResponse = ShowConfirmAlert(
          `About to delete ${selectedTagsPath.length} tags, continue?`,
          'This action cannot be reverted.',
        );
        if (confirmAlertResponse === 1) return;
        selectedTagsPath.forEach(tagPath => {
          try {
            UnlinkTag(tagPath);
          } catch (e) {
            ShowErrorAlert((e as Error).message);
          }
        });
        //NOTE: pushing and signaling will be done in the fileWatcher
      },
    },
  ]);

  const senderWindow = BrowserWindow.fromWebContents(_event.sender);
  if (senderWindow) menu.popup({ window: senderWindow });
}

/************
 * - DATA -
 ************/

const { PUSH_ALL_OPENED_FILES } = IPCActions.DATA; //receiving channel

// On trigger, push opened files to renderer through OPENED_FILES_CHANGED
function PushOpenedFiles(_event: IpcMainEvent) {
  const OpenedFilesData = GetOpenedFiles();

  _event.sender.send(IPCActions.DATA.PUSH.OPENED_FILES_CHANGED, OpenedFilesData);

  return;
}

const { UPDATE_OPENED_FILE_CONTENT } = IPCActions.DATA; //receiving channel

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
  _event.sender.send(IPCActions.DATA.PUSH.OPENED_FILE_CONTENT_CHANGED, RendererPayload);

  return;
}

const { CHANGE_ACTIVE_FILE } = IPCActions.DATA; // Receiving
function ChangeActiveFileAndPush(_event: IpcMainEvent, NewTargetFile: TFileInMemory) {
  ChangeActiveFile(NewTargetFile);
  _event.sender.send(IPCActions.DATA.PUSH.ACTIVE_FILE_CHANGED, GetActiveFile());
}

// -Search
const { SET_NEW_SEARCH_TARGET } = IPCActions.DATA; // Receiving
function SetNewSearchAndPush(_event: IpcMainEvent, NewSearch: TSearchTarget) {
  if (!NewSearch) return;

  // cache the search
  SetSearchTargetToken(NewSearch);

  _event.sender.send(IPCActions.DATA.PUSH.BEGIN_NEW_SEARCH, GetLastSearchTargetToken());
}

const { SET_FILTERED_DATA } = IPCActions.DATA; // Receiving

function SetFilteredDataAndPush(_event: IpcMainEvent, NewFilteredData: TSearchFilteredData) {
  if (!NewFilteredData) return;

  SetFilteredData(NewFilteredData);

  _event.sender.send(IPCActions.DATA.PUSH.FILTERED_DATA_CHANGED, GetAllFilteredData());
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
  { trigger: SHOW_TAG_OPERATION_MENU, listener: ShowTagOperationMenu },
  { trigger: SET_FILTERED_DATA, listener: SetFilteredDataAndPush },
];
