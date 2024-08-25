import path from 'path-browserify';

import Store from 'electron-store';

import { TFileInMemory } from '../Types/GlobalData.ts';
import { TMDFile } from '../Types/Files.ts';
import { AppData_Keys } from './Persistence.ts';
import ElectronStore from 'electron-store';

// set and get previous app configs
let _Config_Store: ElectronStore | null = null;

export function GetConfigStore(): Readonly<ElectronStore> | null {
  return _Config_Store;
}

export function InitConfigStore() {
  _Config_Store = new Store();
}

let _App_MainWindow_ID = 0;

export function SetAppMainWindowID(id: number) {
  _App_MainWindow_ID = id;
}

export function GetAppMainWindowID() {
  return _App_MainWindow_ID;
}

/**
 * the working directory
 */
let _Current_Workspace: string = ''; //main process will load or create folder.

let _Recent_Workspaces: string[] = [];

/**
 * Changes the current working directory of the workspace.
 *
 * @param {string} directory - The new working directory.
 * @returns {string} The old working directory.
 */
export function SetCurrentWorkspaceThenStore(directory: string) {
  if (path.normalize(directory) === path.normalize(_Current_Workspace)) {
    console.log('same workspace dir');
    return null;
  }
  let oldWorkspace = _Current_Workspace;
  _Current_Workspace = String(directory);

  // persist the data
  const store = GetConfigStore();
  if (store) store.set(AppData_Keys.currentWorkspace, _Current_Workspace);

  return oldWorkspace;
}

export function SyncWorkspaceAndRecentsThenStore() {
  let recentPathMap = new Map(_Recent_Workspaces.map(item => [item, true]));

  if (!recentPathMap.get(_Current_Workspace)) return;

  // remove from "recent" if present
  recentPathMap.delete(_Current_Workspace);

  _Recent_Workspaces = Array.from(recentPathMap, ([key]) => key);

  const store = GetConfigStore();
  if (store) store.set(AppData_Keys.recentWorkspace, _Recent_Workspaces);
}

export function GetCurrentWorkspace(): Readonly<string> {
  return _Current_Workspace;
}

export function GetRecentWorkspace(): Readonly<string[]> {
  return [..._Recent_Workspaces];
}

export function AddToRecentWorkspaceAndStore(lastestWorkspace: string) {
  let recentWorkspaceMap = new Map(_Recent_Workspaces.map(item => [item, true]));
  if (recentWorkspaceMap.get(lastestWorkspace)) return; //duplicated
  _Recent_Workspaces.push(lastestWorkspace);
  const store = GetConfigStore();
  if (store) store.set(AppData_Keys.recentWorkspace, _Recent_Workspaces);
  return [..._Recent_Workspaces];
}

export function RemoveFromRecentWorkspacesAndStore(workspacePath: string) {
  if (workspacePath.trim() === '') return;

  _Recent_Workspaces = _Recent_Workspaces.filter(path => path !== workspacePath);

  const store = GetConfigStore();
  if (store) store.set(AppData_Keys.recentWorkspace, _Recent_Workspaces);
}

// Override all, no checking for dups, used by init only
export function SetRecentWorkSpace([...newArr]: string[]) {
  _Recent_Workspaces = newArr;
}

/**
 * Array, matches the order of tabs in tabframe component
 */
let _Opened_Files: TFileInMemory[] = [];

// mainly used to reset the order(from tab frame)
export function SetOpenFiles(openedFiles: TFileInMemory[]) {
  _Opened_Files = [...openedFiles];
}

export function GetOpenedFiles(): ReadonlyArray<TFileInMemory> {
  return [..._Opened_Files];
}

export function FindInOpenedFilesByFullPath(FilePath: string) {
  return _Opened_Files.filter((arrItem: TFileInMemory) => arrItem.fullPath === FilePath);
}

export function UpdateOpenedFile(FilePath: string, NewFileInfo: TFileInMemory) {
  const findIndex = _Opened_Files.findIndex((arrItem: TFileInMemory) => arrItem.fullPath === FilePath);
  if (findIndex === -1) return;
  _Opened_Files[findIndex] = { ...NewFileInfo };
}

export function ChecksInOpenedFiles(FileInfo: TFileInMemory) {
  return _Opened_Files.some((arrItem: TFileInMemory) => arrItem.fullPath === FileInfo.fullPath);
}

export function AddToOpenedFiles(FileInfo: TFileInMemory) {
  const arr = [..._Opened_Files];
  // already have the element
  if (arr.some((arrItem: TFileInMemory) => arrItem.fullPath === FileInfo.fullPath)) {
    return;
  }

  // NOTE: shallow copy
  _Opened_Files.push({ ...FileInfo });
  return;
}

export function RemoveAllOpenFiles() {
  _Opened_Files = [];
}

export function RemoveOpenedFile(removingItem: TFileInMemory | string) {
  const arr = [..._Opened_Files];
  let index = -1;

  let targetPath = '';

  if (typeof removingItem === 'string') targetPath = removingItem;
  else targetPath = removingItem.fullPath;

  arr.some((arrItem: TFileInMemory, arrIndex) => {
    if (arrItem.fullPath === targetPath) {
      index = arrIndex;
      return true;
    }
    return false;
  });

  index > -1 && arr.splice(index, 1);
  _Opened_Files = arr;
  return index > -1;
}

/**
 * the file the editor is editing or last edited
 */
let _Active_File: TFileInMemory | null = null;

export function GetActiveFile(): Readonly<TFileInMemory> | null {
  return _Active_File ? Object.assign({}, _Active_File) : null;
}

export function ChangeActiveFile(NewTargetFile: TFileInMemory | null) {
  if (!NewTargetFile) {
    _Active_File = null;
    return;
  }
  if (!NewTargetFile.fullPath) return;
  _Active_File = Object.assign({}, NewTargetFile);
}

// the HTML string for the current active content, it will be updated when editor opened up a new file
let _Active_File_Content: string = '';

export function SetActiveFileContent(newContent: string) {
  _Active_File_Content = newContent;
}

export function GetActiveFileContent() {
  return _Active_File_Content;
}

/**
 * Cached caret positions
 */

// key:fullpath, value: selection status object or null
let _Selection_Status_Cache = new Map<string, Object | null>();

export function GetSelectionStatusCache(fullPath: string): Readonly<Object | null | undefined> {
  return _Selection_Status_Cache.get(fullPath);
}

export function GetALLSelectionStatusCache(): Readonly<Map<string, Object | null>> {
  return new Map(_Selection_Status_Cache);
}

export function SetSelectionStatusCache(fullPath: string, status: Object | null) {
  _Selection_Status_Cache.set(fullPath, status);
}

// primarily used in searching
let _MD_Files_List: TMDFile[] = [];

export function SetMDFilesList(newList: TMDFile[]) {
  if (!newList || !Array.isArray(newList)) return;
  _MD_Files_List = newList;
}

export function GetMDFilesList(): Readonly<TMDFile[]> {
  return [..._MD_Files_List];
}

// similar to tags, add the file path to this array when a delete operation(renaming/del) is generated by the user
let _Renaming_or_deleted_files_path: string[] = [];

// used only in the interfaces that the user might reach
export function MarkFileForFileChange(renamingPath: string) {
  _Renaming_or_deleted_files_path.push(renamingPath);
}

// unlike tags, this is used in the saving function when needed to prevent unnecessary error prompt.
//  TODO: need to change the logic here if saving is no longer associated with component unmount.
export function ConsumeFileChangeMark(tagPath: string) {
  const findIndex = _Renaming_or_deleted_files_path.findIndex(item => item === tagPath);
  if (findIndex >= 0) _Renaming_or_deleted_files_path.splice(findIndex, 1);
}

export function CheckForFileChanging(tagPath: string) {
  const findIndex = _Renaming_or_deleted_files_path.findIndex(item => item === tagPath);
  return findIndex >= 0;
}
