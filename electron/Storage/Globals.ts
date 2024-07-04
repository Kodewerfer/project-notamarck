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

export function AddToOpenedFiles(FileInfo: TOpenedFiles) {
  // NOTE: shallow copy
  return _Opened_Files.push({ ...FileInfo });
}

export function RemoveOpenedFile(
  arr = [..._Opened_Files],
  item: TOpenedFiles,
): ReadonlyArray<TOpenedFiles> {
  const index = arr.indexOf(item);
  index > -1 && arr.splice(index, 1);
  _Opened_Files = arr;
  return arr;
}
