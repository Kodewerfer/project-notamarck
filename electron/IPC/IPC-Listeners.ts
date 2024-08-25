// Bind to ipMain.on, one-way communications
import { IPCActions } from './IPC-Actions.ts';
import {
  ChangeActiveFile,
  FindInOpenedFilesByFullPath,
  GetActiveFile,
  GetActiveFileContent,
  GetCurrentWorkspace,
  GetOpenedFiles,
  GetRecentWorkspace,
  RemoveFromRecentWorkspacesAndStore,
  SetActiveFileContent,
  SetOpenFiles,
  UpdateOpenedFile,
} from '../Data/Globals.ts';
import { BrowserWindow, Menu, Notification, shell } from 'electron';
import IpcMainEvent = Electron.IpcMainEvent;
import { SaveContentToFileOverrideOnDup, UnlinkFile } from '../Utils/FileOperations.ts';
import { ShowConfirmAlert, ShowErrorAlert } from '../Utils/ErrorsAndPrompts.ts';
import { TFileInMemory } from '../Types/GlobalData.ts';
import { TChangedFilesPayload } from '../Types/IPC.ts';
import {
  ExtractFileLinksNamesFromTagAST,
  OpenAndSearchFilesForTag,
  SaveTagFileOverrideOnDup,
  SaveTagFileRenameOnDup,
  SearchInTagAndAppend,
  SearchInTagAndRemoveFileLink,
  UnlinkTag,
  ValidateTag,
} from '../Utils/TagOperations.ts';
import { GetLastSearchTargetToken, SetSearchTargetToken } from '../Data/Seach.ts';
import { ESearchTypes, TSearchTarget } from '../Types/Search.ts';
import { TagObjectToMD } from '../Utils/TagFileConvertor.ts';
// @ts-ignore
import { Compatible } from 'unified/lib';
import path from 'node:path';
import { Parent } from 'unist';
import { TTagsInMemory } from 'electron-src/Types/Tags.ts';
import log from 'electron-log';

/***********
 * - APP -
 ***********/

const { REMOVE_FROM_RECENT_WORK_SPACES } = IPCActions.APP; //receiving channel

function RemovePathFromRecentWorkspaces(_event: IpcMainEvent, workspacePath: string) {
  RemoveFromRecentWorkspacesAndStore(workspacePath);
  _event.sender.send(IPCActions.APP.PUSH.RECENT_WORK_SPACES_CHANGED, GetRecentWorkspace());
}

/***********
 * - Shell -
 ***********/

const { OPEN_EXTERNAL_HTTP } = IPCActions.SHELL; //receiving channel

function OpenHTTPLinkFromOutside(_event: IpcMainEvent, httpLink: string) {
  if (!httpLink || httpLink === '') return;

  const protocolRegex = /^https?:\/\//i;

  // If the text does not start with http:// or https://, prepend http://
  if (!protocolRegex.test(httpLink)) {
    httpLink = 'http://' + httpLink;
  }

  shell.openExternal(httpLink);
}

/*******************
 * - NOTIFICATION -
 *******************/

const { SHOW_NOTIFICATION } = IPCActions.NOTIFICATION; //receiving channel
// Pushing channels: multiple, check code

function SendNotification(_event: IpcMainEvent, title: string, body: string) {
  if (!title) return;
  new Notification({
    title: title,
    body: body || '',
  }).show();
}

/************
 * - MENU -
 ************/
const { SHOW_FILE_OPERATION_MENU } = IPCActions.MENU; //receiving channel
// Pushing channels: multiple, check code
function ShowFileOperationMenu(_event: IpcMainEvent, selectedFilesPath: string[]) {
  if (!selectedFilesPath) return;
  const menu = Menu.buildFromTemplate([
    {
      label: 'New File',
      click: () => {
        const NewFileSearch: TSearchTarget = {
          placeHolder: 'New File',
          searchType: ESearchTypes.File,
        };
        SetNewSearchAndPush(_event, NewFileSearch);
      },
    },
    { type: 'separator' },
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
            log.error(e);
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

const { SET_ACTIVE_FILE_CONTENT } = IPCActions.DATA; //receiving channel

function ChangeActiveFileContentAndPush(_event: IpcMainEvent, newContent: string) {
  SetActiveFileContent(newContent);

  _event.sender.send(IPCActions.DATA.PUSH.ACTIVE_FILE_CONTENT_CHANGED, GetActiveFileContent());
}

const { PUSH_ALL_OPENED_FILES } = IPCActions.DATA; //receiving channel

// On trigger, push opened files to renderer through OPENED_FILES_CHANGED
function PushOpenedFiles(_event: IpcMainEvent) {
  const OpenedFilesData = GetOpenedFiles();

  _event.sender.send(IPCActions.DATA.PUSH.OPENED_FILES_CHANGED, OpenedFilesData);

  return;
}

const { SET_OPENED_FILES } = IPCActions.DATA;

function SetOpenedFiles(_Event: IpcMainEvent, newArray: TFileInMemory[]) {
  if (!newArray || !newArray.length) return;
  return SetOpenFiles(newArray);
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

/****************
 * - EDITOR_MD -
 ****************/

const { SET_JUMP_TO_LINE } = IPCActions.EDITOR_MD; // Receiving
function PushNewLineNum(_event: IpcMainEvent, lineNum: number) {
  _event.sender.send(IPCActions.EDITOR_MD.PUSH.NEW_JUMP_TO_LINE_TARGET, lineNum);
}

const { SET_CONTENT_SEARCH_RESULT } = IPCActions.EDITOR_MD; // Receiving
// A simple server forwarding for result so that component structure won't matter
function PushNewContentSearchResult(_event: IpcMainEvent, newSearchResult: number[]) {
  _event.sender.send(IPCActions.EDITOR_MD.PUSH.NEW_CONTENT_SEARCH_RESULT, newSearchResult);
}

const { INSERT_FILE_LINK } = IPCActions.EDITOR_MD; // Receiving
// md syntax for the
const fileLinkSyntax = (target: string) => `:Link[${target}]`;

function InsertLinkToCurrentEditorTab(_event: IpcMainEvent, InsertDataSource: any) {
  if (!InsertDataSource) return;
  let LinkTarget = '';
  if (InsertDataSource.tagPath) {
    // tag
    LinkTarget = InsertDataSource.tagFileName;
  } else {
    // Main folder md files
    LinkTarget = InsertDataSource.name;
  }

  _event.sender.send(IPCActions.EDITOR_MD.PUSH.TEXT_INSERT_REQUEST, fileLinkSyntax(LinkTarget));
}

/************
 * - FILE -
 ************/

// --Files
const { CHANGE_TARGET_FILE_CONTENT } = IPCActions.FILES; // Receiving

function UpdateTargetFileOverrideOnDup(_event: IpcMainEvent, FileFullPath: string, FileContent: string) {
  try {
    path.resolve(FileFullPath);
  } catch (e) {
    ShowErrorAlert((e as Error).message);
  }

  try {
    SaveContentToFileOverrideOnDup(FileFullPath, FileContent);
  } catch (e) {
    ShowErrorAlert((e as Error).message);
  }
}

const { VALIDATE_TAG_IN_LINKED_FILES } = IPCActions.FILES; // Receiving

function ValidateTagInFiles(_event: IpcMainEvent, EditingTag: TTagsInMemory, tagASTArr: Parent[]) {
  if (!tagASTArr || !Array.isArray(tagASTArr)) return;

  const FileNames = ExtractFileLinksNamesFromTagAST(tagASTArr);
  FileNames.forEach(filename => {
    const checkResult = OpenAndSearchFilesForTag(path.join(GetCurrentWorkspace(), filename), EditingTag);
    if (!checkResult) {
      SearchInTagAndRemoveFileLink(EditingTag.tagFileName, filename);
      new Notification({
        title: 'File no longer have tag reference',
        body: `Removed reference ${filename} from tag`,
      });
    }
  });
}

// --tags
const { SYNC_TO_TAG } = IPCActions.FILES; // Receiving

function SyncToTag(_event: IpcMainEvent, targetTag: string, FromFile: string) {
  if (!targetTag.includes('.tag')) return; //not a link to tag
  try {
    ValidateTag(targetTag);
  } catch (e) {
    // Error accessing the tag, create a new tag with the name provided.
    SaveTagFileRenameOnDup(targetTag);
  }

  SearchInTagAndAppend(targetTag, FromFile);
}

const { REMOVE_FROM_TAG } = IPCActions.FILES; // Receiving

function RemoveFromTag(_event: IpcMainEvent, targetTag: string, FromFile: string) {
  if (!targetTag.includes('.tag')) return; //not a link to tag
  try {
    ValidateTag(targetTag);
  } catch (e) {
    ShowErrorAlert(`Trying to remove link from a tag that cannot be accessed ${targetTag}`);
  }

  SearchInTagAndRemoveFileLink(targetTag, FromFile);
}

const { UPDATE_TARGET_TAG_CONTENT } = IPCActions.FILES; // Receiving
function UpdateTagContentAndPush(_event: IpcMainEvent, tagPath: string, Content: Compatible) {
  if (!Content || !tagPath || tagPath === '') return;
  const content = TagObjectToMD(Content);
  if (content) SaveTagFileOverrideOnDup(tagPath, content);
}

// Bind to ipcMain.handle, one-way communications
export const IPCListenerMappings = [
  {
    trigger: PUSH_ALL_OPENED_FILES,
    listener: PushOpenedFiles,
  },
  { trigger: SET_OPENED_FILES, listener: SetOpenedFiles },
  { trigger: UPDATE_OPENED_FILE_CONTENT, listener: UpdateFileContentAndPush },
  { trigger: CHANGE_ACTIVE_FILE, listener: ChangeActiveFileAndPush },
  { trigger: SHOW_FILE_OPERATION_MENU, listener: ShowFileOperationMenu },
  { trigger: SET_NEW_SEARCH_TARGET, listener: SetNewSearchAndPush },
  { trigger: SHOW_TAG_OPERATION_MENU, listener: ShowTagOperationMenu },
  { trigger: SYNC_TO_TAG, listener: SyncToTag },
  { trigger: REMOVE_FROM_TAG, listener: RemoveFromTag },
  { trigger: UPDATE_TARGET_TAG_CONTENT, listener: UpdateTagContentAndPush },
  { trigger: INSERT_FILE_LINK, listener: InsertLinkToCurrentEditorTab },
  { trigger: SHOW_NOTIFICATION, listener: SendNotification },
  { trigger: CHANGE_TARGET_FILE_CONTENT, listener: UpdateTargetFileOverrideOnDup },
  { trigger: SET_ACTIVE_FILE_CONTENT, listener: ChangeActiveFileContentAndPush },
  { trigger: SET_CONTENT_SEARCH_RESULT, listener: PushNewContentSearchResult },
  { trigger: SET_JUMP_TO_LINE, listener: PushNewLineNum },
  { trigger: OPEN_EXTERNAL_HTTP, listener: OpenHTTPLinkFromOutside },
  { trigger: VALIDATE_TAG_IN_LINKED_FILES, listener: ValidateTagInFiles },
  { trigger: REMOVE_FROM_RECENT_WORK_SPACES, listener: RemovePathFromRecentWorkspaces },
];
