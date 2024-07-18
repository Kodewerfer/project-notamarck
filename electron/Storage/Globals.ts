import path from 'path-browserify';

export type TFileInMemory = {
  filename: string;
  fullPath: string;
  title?: string;
  content?: string;
};

/**
 * Array, matches the order of tabs in tabframe component
 */
let _Opened_Files: TFileInMemory[] = [];

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

export function RemoveOpenedFile(removingItem: TFileInMemory): ReadonlyArray<TFileInMemory> {
  const arr = [..._Opened_Files];
  let index = -1;

  arr.some((arrItem: TFileInMemory, arrIndex) => {
    if (arrItem.fullPath === removingItem.fullPath) {
      index = arrIndex;
      return true;
    }
    return false;
  });

  index > -1 && arr.splice(index, 1);
  _Opened_Files = arr;
  return arr;
}

/**
 * the file the editor is editing or last edited
 */
let _Active_File: TFileInMemory | null = null;

export function GetActiveFile(): Readonly<TFileInMemory> | null {
  return _Active_File ? Object.assign({}, _Active_File) : null;
}

export function ChangeActiveFile(NewTargetFile: TFileInMemory) {
  if (!NewTargetFile || !NewTargetFile.fullPath) return;
  _Active_File = Object.assign({}, NewTargetFile);
}

/**
 * the working directory
 */
let _Current_Workspace: string = '';

let _Recent_Workspaces: string[] = [];

/**
 * Changes the current working directory of the workspace.
 *
 * @param {string} directory - The new working directory.
 * @returns {string} The old working directory.
 */
export function ChangeWorkspace(directory: string) {
  if (path.normalize(directory) === path.normalize(_Current_Workspace)) {
    console.log('same workspace dir');
    return null;
  }
  let oldWorkspace = _Current_Workspace;
  _Current_Workspace = String(directory);
  return oldWorkspace;
}

export function SyncWorkspaceAndRecents() {
  let recentPathMap = new Map(_Recent_Workspaces.map(item => [item, true]));

  if (!recentPathMap.get(_Current_Workspace)) return;

  // remove from "recent" if present
  recentPathMap.delete(_Current_Workspace);

  _Recent_Workspaces = Array.from(recentPathMap, ([key]) => key);
}

export function GetCurrentWorkspace(): Readonly<string> {
  return _Current_Workspace;
}

export function GetRecentWorkspace(): Readonly<string[]> {
  return [..._Recent_Workspaces];
}

export function AddToRecentWorkspace(lastestWorkspace: string) {
  let recentWorkspaceMap = new Map(_Recent_Workspaces.map(item => [item, true]));
  if (recentWorkspaceMap.get(lastestWorkspace)) return; //duplicated
  _Recent_Workspaces.push(lastestWorkspace);
  return [..._Recent_Workspaces];
}
