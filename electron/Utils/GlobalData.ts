import { ChangeActiveFile, GetActiveFile, GetOpenedFiles } from '../Data/Globals.ts';

export function ReassignActiveFile() {
  const openedFiles = GetOpenedFiles();
  const activeFile = GetActiveFile();

  const nonActiveFile = openedFiles.find(file => file.fullPath !== activeFile?.fullPath);
  if (!nonActiveFile || openedFiles.length === 0) return ChangeActiveFile(null);
  ChangeActiveFile(nonActiveFile);
}
