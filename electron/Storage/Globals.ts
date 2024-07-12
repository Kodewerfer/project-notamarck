export type TOpenedFiles = {
  filename: string;
  fullPath: string;
  title?: string;
  content?: string;
};

// Array, matches the order of tabs in tabframe component
let _Opened_Files: TOpenedFiles[] = [];

export function GetOpenedFiles(): ReadonlyArray<TOpenedFiles> {
  return [..._Opened_Files];
}

export function FindInOpenedFilesByFullPath(FilePath: string) {
  return _Opened_Files.filter((arrItem: TOpenedFiles) => arrItem.fullPath === FilePath);
}

export function UpdateOpenedFile(FilePath: string, NewFileInfo: TOpenedFiles) {
  const findIndex = _Opened_Files.findIndex((arrItem: TOpenedFiles) => arrItem.fullPath === FilePath);
  if (findIndex === -1) return;
  _Opened_Files[findIndex] = { ...NewFileInfo };
}

export function ChecksInOpenedFiles(FileInfo: TOpenedFiles) {
  return _Opened_Files.some((arrItem: TOpenedFiles) => arrItem.fullPath === FileInfo.fullPath);
}

export function AddToOpenedFiles(FileInfo: TOpenedFiles) {
  const arr = [..._Opened_Files];
  // already have the element
  if (arr.some((arrItem: TOpenedFiles) => arrItem.fullPath === FileInfo.fullPath)) {
    return;
  }

  // NOTE: shallow copy
  _Opened_Files.push({ ...FileInfo });
  return;
}

export function RemoveOpenedFile(removingItem: TOpenedFiles): ReadonlyArray<TOpenedFiles> {
  const arr = [..._Opened_Files];
  let index = -1;

  arr.some((arrItem: TOpenedFiles, arrIndex) => {
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
