import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow } from 'electron';
import { CheckFileRenameOnDup } from './FileOperations.ts';
import { GetAppMainWindowID, GetCurrentWorkspace } from '../Data/Globals.ts';
import { TTagsInMemory } from '../Types/Tags.ts';
import { ShowErrorAlert } from '../Utils/ErrorsAndPrompts.ts';

import FlexSearch from 'flexsearch';
import { Parent } from 'unist';
import { CleanTagMap, SetTagMapByItem } from '../Data/Tags.ts';
import { IPCActions } from '../IPC/IPC-Actions.ts';
import log from 'electron-log';

const _Tag_Folder_Name = 'tags';

export function GetFileLinkSyntax(fromFile: string) {
  if (!fromFile || fromFile === '') throw new Error('file name is required');
  return `:Link[${fromFile}]`;
}

export function GetTagFolderFullPath() {
  const tagFolderFullPath = path.join(GetCurrentWorkspace(), _Tag_Folder_Name).normalize();
  if (!fs.existsSync(tagFolderFullPath)) {
    try {
      fs.mkdirSync(tagFolderFullPath);
    } catch (e) {
      log.error(`Error getting/creating tag path, ${e}`);
      throw e;
    }
  }

  return tagFolderFullPath;
}

export function ValidateTag(TagFileName: string) {
  TagFileName = TagFileName.split('.')[0];
  const tagFilePath = path.join(GetTagFolderFullPath(), `${TagFileName}.tag.md`);

  fs.accessSync(tagFilePath);
}

export function SaveTagFileRenameOnDup(TagFileName: string, TagContent?: string) {
  TagFileName = path.basename(TagFileName).split('.')[0];
  const tagFilePath = path.join(GetTagFolderFullPath(), `${TagFileName}.tag.md`);

  try {
    path.resolve(tagFilePath);
  } catch (e) {
    log.error(`Tag path ${tagFilePath} is not valid.`, e);
    throw new Error(`Tag path ${tagFilePath} is not valid.`);
  }

  // rename with a -1
  const renamedTagFilePath = CheckFileRenameOnDup(tagFilePath);

  try {
    fs.writeFileSync(renamedTagFilePath, TagContent ?? '', { encoding: 'utf8' });
  } catch (e) {
    log.error(`Error writing to tag ${renamedTagFilePath}, ${(e as Error).message}`);
    throw new Error(`Error writing to tag ${renamedTagFilePath}, ${(e as Error).message}`);
  }

  return tagFilePath;
}

export function SaveTagFileOverrideOnDup(TagFileName: string, TagContent?: string) {
  TagFileName = path.basename(TagFileName).split('.')[0];
  const tagFilePath = path.join(GetTagFolderFullPath(), `${TagFileName}.tag.md`);

  try {
    path.resolve(tagFilePath);
  } catch (e) {
    log.error(`Tag path ${tagFilePath} is not valid.`);
    throw new Error(`Tag path ${tagFilePath} is not valid.`);
  }

  try {
    fs.writeFileSync(tagFilePath, TagContent ?? '', { encoding: 'utf8' });
  } catch (e) {
    log.error(`Error writing to tag ${tagFilePath}, ${(e as Error).message}`);
    throw new Error(`Error writing to tag ${tagFilePath}, ${(e as Error).message}`);
  }

  return tagFilePath;
}

export async function ListAllTagsAsync() {
  const targetPath = GetTagFolderFullPath().normalize();

  const resolvedPath = path.resolve(targetPath);

  await fs.promises.access(resolvedPath);
  const dirContent = await fs.promises.readdir(resolvedPath, { recursive: false, withFileTypes: true });
  const tagList: TTagsInMemory[] = [];

  for (const file of dirContent) {
    if (file.isDirectory()) continue;
    // const tagFileContentRaw = await fs.promises.readFile(path.join(resolvedPath, file.name), 'utf8');
    if (file.isFile() && file.name.endsWith('.tag.md')) {
      tagList.push({
        tagFileName: file.name,
        tagPath: path.join(resolvedPath, file.name),
        // tagContentRaw: tagFileContentRaw,
      });
    }
  }

  return tagList;
}

export async function ReadTagRawAsync(tagPath: string): Promise<TTagsInMemory> {
  await fs.promises.access(tagPath); // will throw on error;

  const tagContentRaw = await fs.promises.readFile(tagPath, 'utf8');

  const baseName = path.basename(tagPath);

  return {
    tagFileName: baseName,
    tagPath: tagPath,
    tagContentRaw: tagContentRaw,
  };
}

// Sync function to avoid unnecessary concurrency issue, only used internally.
export function ReadTagRaw(tagPath: string): TTagsInMemory {
  if (!fs.existsSync(tagPath)) throw new Error('tagPath does not exist');

  const tagContentRaw = fs.readFileSync(tagPath, 'utf8');

  return {
    tagFileName: path.basename(tagPath),
    tagPath: tagPath,
    tagContentRaw: tagContentRaw,
  };
}

// todo: remove from files
export function UnlinkTag(TagFullName: string) {
  try {
    fs.unlinkSync(TagFullName);
  } catch (e) {
    log.error(`Error deleting tag ${TagFullName}, ${e}`);
    throw new Error(`Error deleting tag ${TagFullName}, ${e}`);
  }
}

/**
 * Renames a tag while preserving any duplicates.
 *
 * @param {string} OldTagPath - The path of the tag file to be renamed.
 * @param {string} NewName - The new name for the tag file.
 * @return {string} The final name of the renamed tag file, including any duplicate handling.
 * @throws {Error} If there is an error renaming the tag file.
 */
export function RenameTagKeepDup(OldTagPath: string, NewName: string) {
  const oldPathParse = path.parse(OldTagPath);
  const newNameParse = path.parse(NewName);
  let newBaseName =
    newNameParse.name + (newNameParse.ext.trim() !== '' ? '.tag' + newNameParse.ext : '.tag' + oldPathParse.ext);

  const finalizedNewName = CheckFileRenameOnDup(path.join(oldPathParse.dir, newBaseName));

  try {
    fs.renameSync(OldTagPath, finalizedNewName);
  } catch (e) {
    log.error(`Error renaming tag ${OldTagPath}, ${(e as Error).message}`);
    throw new Error(`Error renaming tag ${OldTagPath}, ${(e as Error).message}`);
  }
  return finalizedNewName;
}

function SearchTagForLink(tagInfo: TTagsInMemory | null, searchFor: string) {
  if (!tagInfo || !tagInfo.tagContentRaw) return null;
  // const lines = tagContent.tagContentRaw.split('\n').map((line, index) => ({ id: index, text: line }));
  const searchDocument = new FlexSearch.Index('performance');
  const lines = tagInfo.tagContentRaw.split('\n');
  // Add data to the index
  for (let i = 0; i < lines.length; i++) {
    searchDocument.add(i, lines[i]);
  }

  const searchResult = searchDocument.search(searchFor);
  if (!searchResult.length) return null;

  return searchResult;
}

/**
 * Opens and searches the files for a given tag.
 *
 * @param {string} FilePath - The path of the file to be opened and searched.
 * @param {TTagsInMemory|null} targetTag - The target tag to search for. If null, returns null.
 *
 * @return {Array<number>} - An array of line numbers where the tag is found. If no matches are found, returns null.
 *
 * @throws - Throws an error if an exception occurs while reading the file.
 */
export function OpenAndSearchFilesForTag(FilePath: string, targetTag: TTagsInMemory | null) {
  if (!targetTag) return null;
  if (!fs.existsSync(FilePath)) return null;
  const tagLinkSyntax = GetFileLinkSyntax(targetTag.tagFileName);

  const searchIndex = new FlexSearch.Index('performance');

  try {
    let MDFileContent = fs.readFileSync(FilePath, { encoding: 'utf8' });
    const lines = MDFileContent.split('\n');

    // Add data to the index
    for (let i = 0; i < lines.length; i++) {
      searchIndex.add(i, lines[i]);
    }
  } catch (e) {
    log.error(`Error in searching tag refs in file, ${e}`);
    throw e;
  }

  const searchResult = searchIndex.search(tagLinkSyntax);
  if (!searchResult.length) return null;

  return searchResult;
}

/**
 * Searches for a file link in a tag file and appends it if not found.
 *
 * @param {string} TagFileName - The name of the tag file (without the extension).
 * @param {string} FromFilePath - The path of the file to be searched and linked in the tag file.
 *
 * @return {void}
 */
export function SearchInTagAndAppend(TagFileName: string, FromFilePath: string) {
  TagFileName = TagFileName.split('.')[0];
  FromFilePath = path.basename(FromFilePath);
  const tagFilePath = path.join(GetTagFolderFullPath(), `${TagFileName}.tag.md`);
  try {
    const tagContent = ReadTagRaw(tagFilePath);
    const searchResult = SearchTagForLink(tagContent, GetFileLinkSyntax(FromFilePath));

    if (searchResult) return;

    fs.appendFileSync(tagFilePath, '\n' + GetFileLinkSyntax(FromFilePath) + '\n');
  } catch (e) {
    log.error('error creating tag reference in file,', (e as Error).message);
    ShowErrorAlert((e as Error).message);
  }
}

/**
 * Searches for a file link within a tag file and removes it.
 *
 * @param {string} TagFileName - The name of the tag file (without extension).
 * @param {string} FromFilePath - The path of the file from which the link is being removed.
 *
 * @return {void}
 */
export function SearchInTagAndRemoveFileLink(TagFileName: string, FromFilePath: string) {
  TagFileName = TagFileName.split('.')[0];
  FromFilePath = path.basename(FromFilePath);
  const tagFilePath = path.join(GetTagFolderFullPath(), `${TagFileName}.tag.md`);
  try {
    const tagContent = ReadTagRaw(tagFilePath);
    const searchResult = SearchTagForLink(tagContent, GetFileLinkSyntax(FromFilePath));

    if (!searchResult) return;
    const rawContentLines = tagContent.tagContentRaw!.split('\n');

    for (let lineNum of searchResult) {
      const updatedLine = rawContentLines[lineNum as number].replace(GetFileLinkSyntax(FromFilePath), '');
      rawContentLines[lineNum as number] = updatedLine;
      if (updatedLine.trim() === '') {
        rawContentLines.splice(lineNum as number, 1);
      }
    }

    SaveTagFileOverrideOnDup(tagFilePath, rawContentLines.join('\n'));
  } catch (e) {
    log.error('error removing file reference in tag,', (e as Error).message);
    ShowErrorAlert((e as Error).message);
  }
}

/**
 * Extracts file link names from a tag abstract syntax tree (AST) array.
 *
 * @param {Parent[]} tagASTArr - An array of ASTs representing the tag.
 *
 * @return {string[]} - An array of extracted file names.
 */
export function ExtractFileLinksNamesFromTagAST(tagASTArr: Parent[]) {
  let ExtractedFileNames: string[] = [];

  for (let paragraph of tagASTArr) {
    if (paragraph.type !== 'paragraph') continue;

    // only check the first child
    if (!paragraph.children || paragraph.children[0].type !== 'textDirective') continue;

    let linkDirective = paragraph.children[0];

    ExtractedFileNames.push(((linkDirective as Parent).children[0] as any).value || '');
  }

  return ExtractedFileNames;
}

export async function ResetAndCacheTagsListAsync() {
  CleanTagMap();
  try {
    const allTags = await ListAllTagsAsync();

    if (!allTags || !allTags.length) return;

    allTags.forEach((tag: TTagsInMemory) => {
      SetTagMapByItem(tag);
    });
  } catch (e) {
    ShowErrorAlert('Error in listing tags', (e as Error).message);
    log.error('Error in listing tags', (e as Error).message);
  }
  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.FILES.SIGNAL.TAG_LIST_CHANGED);
}
