import fs from 'node:fs';
import { CheckFileRenameOnDup } from './FileOperations.ts';
import { GetCurrentWorkspace } from '../Data/Globals.ts';
import path from 'node:path';
import { TTagsInMemory } from '../Types/Tags.ts';
import { ShowErrorAlert } from '../Utils/ErrorsAndPrompts.ts';

import FlexSearch from 'flexsearch';

const _Tag_Folder_Name = 'tags';

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

export function GetFileLinkSyntax(fromFile: string) {
  if (!fromFile || fromFile === '') throw new Error('file name is required');
  return `:Link[${fromFile}]`;
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
  // TODO: may need to delete reference
  try {
    fs.unlinkSync(TagFullName);
  } catch (e) {
    throw new Error(`Error deleting tag ${TagFullName}, ${e}`);
  }
}

export function RenameTagKeepDup(OldTagPath: string, NewName: string) {
  // TODO: may need to fix references

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

export function SearchAndAppendToTag(TagFileName: string, FromFilePath: string) {
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

export function SearchAndRemoveFromTag(TagFileName: string, FromFilePath: string) {
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
