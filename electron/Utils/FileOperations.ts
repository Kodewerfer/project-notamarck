import path from 'node:path';
import fs from 'node:fs';
import {
  AddToOpenedFiles,
  CheckForFileChanging,
  ConsumeFileChangeMark,
  GetAppMainWindowID,
  GetCurrentWorkspace,
  SetMDFilesList,
} from '../Data/Globals.ts';
import { FormatFileSize } from '../Helper.ts';
import { TMDFile } from '../Types/Files.ts';
import { BrowserWindow, dialog } from 'electron';
import { IPCActions } from '../IPC/IPC-Actions.ts';
import { ShowErrorAlert } from '../Utils/ErrorsAndPrompts.ts';
import log from 'electron-log';

/**
 * Cleans up the given file name.
 *
 * @param {string} filename - The file name to be cleaned up.
 *
 * @return {string} - The cleaned up file name with the extension '.md'.
 */
export function CleanupFileName(filename: string) {
  // in case it contains path;
  let { name: newFileName } = path.parse(filename);

  const dotIndex = newFileName.indexOf('.');
  if (dotIndex !== -1) {
    newFileName = newFileName.substring(0, dotIndex);
  }
  return newFileName + '.md';
}

/**
 * Reads the content of a markdown (MD) file.
 *
 * @param {string} targetPath - The path of the MD file to read.
 *
 * @return {string|null} The content of the MD file as a string, or null if there was an error reading the file.
 */

export function ReadMDFile(targetPath: string) {
  let content = null;
  try {
    fs.accessSync(targetPath);

    content = fs.readFileSync(targetPath, { encoding: 'utf8' });
  } catch (e) {
    log.error(`Error reading md file's content, ${(e as Error).message}`);
    ShowErrorAlert(`Error reading md file's content, ${(e as Error).message}`);
  }
  return content;
}

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
    log.error(`Error reading and adding to open file, ${e}`);
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
    log.error(`Error writing to file ${renamedFileFullName}, ${e}`);
    throw new Error(`Error writing to file ${renamedFileFullName}, ${e}`);
  }
}

export function SaveContentToFileOverrideOnDup(
  FileFullName: string,
  FileContent?: string,
  shouldShowAlertOnDup: boolean = false,
) {
  if (CheckForFileChanging(FileFullName)) {
    ConsumeFileChangeMark(FileFullName);
    return;
  }

  if (fs.existsSync(FileFullName) && shouldShowAlertOnDup) {
    const buttongpress = dialog.showMessageBoxSync({
      type: 'warning',
      message: 'Overriding existing file',
      detail: `${path.parse(FileFullName).name} will be overridden, continue?`,
      buttons: ['yes', 'no'],
    });
    if (buttongpress === 1) return;
  }

  try {
    fs.writeFileSync(FileFullName, FileContent ?? '', { encoding: 'utf8' });
  } catch (e) {
    log.error(`Error writing to file ${FileFullName}, ${e}`);
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
    log.error(`Error renaming file ${OldFullPath}, ${e}`);
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
    log.error(`Error deleting file ${FileFullName}, ${e}`);
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
  const files = await fs.promises.readdir(currentWorkspace, { withFileTypes: true, recursive: false });
  const MDFiles = [];

  for (const file of files) {
    const filePath = path.join(currentWorkspace, file.name);
    const fileStats = await fs.promises.stat(filePath);

    // Check if it is a file and ends with .md
    if (fileStats.isFile() && file.name.endsWith('.md')) {
      MDFiles.push({
        name: file.name,
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

  try {
    const mdFiles = await ListAllMDAsync();
    SetMDFilesList(mdFiles);
  } catch (e) {
    ShowErrorAlert('Error in listing files', (e as Error).message);
    log.error('Error in listing files', (e as Error).message);
  }
  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.FILES.SIGNAL.MD_LIST_CHANGED);
}
