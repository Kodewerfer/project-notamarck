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

export function FindInOpenedFiles(FileInfo: TOpenedFiles) {
  return _Opened_Files.some((arrItem: TOpenedFiles) => arrItem.fullPath === FileInfo.fullPath);
}

export function AddToOpenedFiles(arr = [..._Opened_Files], FileInfo: TOpenedFiles) {
  // already have the element
  if (arr.some((arrItem: TOpenedFiles) => arrItem.fullPath === FileInfo.fullPath)) {
    return _Opened_Files.length;
  }

  // NOTE: shallow copy
  return _Opened_Files.push({ ...FileInfo });
}

export function RemoveOpenedFile(arr = [..._Opened_Files], removingItem: TOpenedFiles): ReadonlyArray<TOpenedFiles> {
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
