import path from 'node:path';
import fs from 'node:fs';
import { AddToOpenedFiles, GetAppMainWindowID, GetCurrentWorkspace, SetMDFilesList } from '../Data/Globals.ts';
import { FormatFileSize } from '../Helper.ts';
import { TMDFile } from '../Types/Files.ts';
import { BrowserWindow } from 'electron';
import { IPCActions } from '../IPC/IPC-Actions.ts';

/**
 * Reads the contents of a Markdown file specified by the targetPath and adds the information to the opened files.
 *
 * @param {string} targetPath - The path to the Markdown file.
 */
export function ReadMDAndAddToOpenedFile(targetPath: string) {
  try {
    let MDFileContent = fs.readFileSync(targetPath, { encoding: 'utf8' });
    const MDFileInfo = {
      fullPath: targetPath,
      filename: path.basename(targetPath),
      content: MDFileContent,
    };
    AddToOpenedFiles(MDFileInfo);
    return MDFileInfo;
  } catch (e) {
    throw e;
  }
}

/**
 * Saves content to a file and renames the file if it already exists.
 *
 * @param {string} FileFullName - The full name (including path) of the file to save the content to.
 * @param {string} [FileContent] - The content to be written to the file. If not provided, an empty string will be written.
 *
 * @throws {Error} Throws an error if there was an issue writing to the file.
 */
export function SaveContentToFileRenameOnDup(FileFullName: string, FileContent?: string) {
  // rename with a -1
  const renamedFileFullName = CheckFileRenameOnDup(FileFullName);
  try {
    fs.writeFileSync(renamedFileFullName, FileContent ?? '', { encoding: 'utf8' });
  } catch (e) {
    throw new Error(`Error writing to file ${renamedFileFullName}, ${e}`);
  }
}

/**
 * Saves content to a file and renames the file if it already exists.
 *
 * @param {string} FileFullName - The full name (including path) of the file to save the content to.
 * @param {string} [FileContent] - The content to be written to the file. If not provided, an empty string will be written.
 *
 * @throws {Error} Throws an error if there was an issue writing to the file.
 */
export function SaveContentToFileOverrideOnDup(FileFullName: string, FileContent?: string) {
  fs.accessSync(FileFullName);

  try {
    fs.writeFileSync(FileFullName, FileContent ?? '', { encoding: 'utf8' });
  } catch (e) {
    throw new Error(`Error writing to file ${FileFullName}, ${e}`);
  }
}

/**
 * Renames a file while keeping any duplicate files if encountered.
 *
 * @param {string} OldFullPath - The full path of the file to be renamed.
 * @param {string} NewName - The new name for the file.
 * @returns {string} - The final renamed path of the file.
 * @throws {Error} - If there is an error renaming the file.
 */
export function RenameFileKeepDup(OldFullPath: string, NewName: string) {
  const oldPathParse = path.parse(OldFullPath);
  const newNameParse = path.parse(NewName);
  let newBaseName = newNameParse.name + (newNameParse.ext.trim() !== '' ? newNameParse.ext : oldPathParse.ext);

  const finalizedNewName = CheckFileRenameOnDup(path.join(oldPathParse.dir, newBaseName));

  try {
    fs.renameSync(OldFullPath, finalizedNewName);
  } catch (e) {
    throw new Error(`Error renaming file ${OldFullPath}, ${e}`);
  }
  return finalizedNewName;
}

/**
 * Deletes a file from the file system.
 *
 * @param {string} FileFullName - The full name of the file to be deleted.
 *
 * @throws {Error} If an error occurs while deleting the file.
 *
 * @example
 * UnlinkFile('/path/to/file.txt');
 */
export function UnlinkFile(FileFullName: string) {
  try {
    fs.unlinkSync(FileFullName);
  } catch (e) {
    throw new Error(`Error deleting file ${FileFullName}, ${e}`);
  }
}

//Internal helpers

/**
 * Checks if a file name already exists and renames it to avoid duplication.
 *
 * @param {string} FileFullName - The full name (including path) of the file.
 * @returns {string} The updated file name if there was a duplication, or the original file name otherwise.
 */
export function CheckFileRenameOnDup(FileFullName: string) {
  let resultName = FileFullName;

  // rename with a -1
  if (fs.existsSync(resultName)) {
    const parsedPath = path.parse(resultName);
    let appendixNum = 1;

    let RealFileName = parsedPath.name;
    let FileNameOtherParts = '';
    // In case the file name has .
    const dotIndex = parsedPath.name.indexOf('.');
    if (dotIndex !== -1) {
      RealFileName = parsedPath.name.substring(0, dotIndex);
      FileNameOtherParts = parsedPath.name.substring(dotIndex);
    }

    do {
      const appendix = `-${appendixNum}`;
      resultName = path.join(parsedPath.dir, `${RealFileName}${appendix}${FileNameOtherParts}${parsedPath.ext}`);
      appendixNum++;
    } while (fs.existsSync(resultName));
  }
  return resultName;
}

export async function ListAllMDAsync(): Promise<TMDFile[]> {
  const currentWorkspace = GetCurrentWorkspace();
  const files = await fs.promises.readdir(currentWorkspace);
  const MDFiles = [];

  for (const file of files) {
    const filePath = path.join(currentWorkspace, file);
    const fileStats = await fs.promises.stat(filePath);

    // Check if it is a file and ends with .md
    if (fileStats.isFile() && file.endsWith('.md')) {
      MDFiles.push({
        name: file,
        path: filePath,
        size: FormatFileSize(fileStats.size ?? 0),
      });
    }
  }

  return MDFiles;
}

export async function ResetAndCacheMDFilesListAsync() {
  // reset the list
  SetMDFilesList([]);

  const mdFiles = await ListAllMDAsync();
  if (!mdFiles || !mdFiles.length) return;

  SetMDFilesList(mdFiles);

  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.FILES.SIGNAL.MD_LIST_CHANGED);
}
