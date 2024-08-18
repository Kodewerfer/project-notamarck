import fs from 'node:fs';
import { CheckFileRenameOnDup } from './FileOperations.ts';
import { GetCurrentWorkspace } from '../Data/Globals.ts';
import path from 'node:path';
import { TTagsInMemory } from '../Types/Tags.ts';
import { ShowErrorAlert } from '../Utils/ErrorsAndPrompts.ts';

import FlexSearch from 'flexsearch';
import { Parent } from 'unist';

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
    throw new Error(`Tag path ${tagFilePath} is not valid.`);
  }

  // rename with a -1
  const renamedTagFilePath = CheckFileRenameOnDup(tagFilePath);

  try {
    fs.writeFileSync(renamedTagFilePath, TagContent ?? '', { encoding: 'utf8' });
  } catch (e) {
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
    throw new Error(`Tag path ${tagFilePath} is not valid.`);
  }

  try {
    fs.writeFileSync(tagFilePath, TagContent ?? '', { encoding: 'utf8' });
  } catch (e) {
    throw new Error(`Error writing to tag ${tagFilePath}, ${(e as Error).message}`);
  }

  return tagFilePath;
}

// unused for now
export function FetchAllTags(): TTagsInMemory[] {
  const targetPath = GetTagFolderFullPath();

  return fs
    .readdirSync(targetPath)
    .filter(file => {
      const fileStats = fs.statSync(path.join(targetPath, file));
      return !fileStats.isDirectory() && file.endsWith('.tag.md');
    })
    .map(file => {
      return {
        tagFileName: file,
        tagPath: path.join(targetPath, file),
      };
    });
}

export async function FetchAllTagsAsync() {
  const targetPath = GetTagFolderFullPath();

  const dirContent = await fs.promises.readdir(targetPath);
  const tagList: TTagsInMemory[] = [];

  for (const file of dirContent) {
    const fileStats = await fs.promises.stat(path.join(targetPath, file));
    const tagFileContentRaw = await fs.promises.readFile(path.join(targetPath, file), 'utf8');
    if (!fileStats.isDirectory() && file.endsWith('.tag.md')) {
      tagList.push({
        tagFileName: file,
        tagPath: path.join(targetPath, file),
        tagContentRaw: tagFileContentRaw,
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

  const baseName = path.basename(tagPath);

  return {
    tagFileName: baseName,
    tagPath: tagPath,
    tagContentRaw: tagContentRaw,
  };
}

export function UnlinkTag(TagFullName: string) {
  try {
    fs.unlinkSync(TagFullName);
  } catch (e) {
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
