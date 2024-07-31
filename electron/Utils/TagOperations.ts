import fs from 'node:fs';
import { CheckFileRenameOnDup } from './FileOperations.ts';
import { GetCurrentWorkspace } from '../Storage/Globals.ts';
import path from 'path-browserify';
import { TTagsInMemory } from 'electron-src/Types/Tags.ts';

const _Tag_Folder_Name = 'tags';

function GetTagFolderFullPath() {
  return path.join(GetCurrentWorkspace(), _Tag_Folder_Name).normalize();
}

export function SaveTagFileRenameOnDup(TagFileName: string, TagContent?: string) {
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
    throw new Error(`Error writing to tag ${renamedTagFilePath}, ${e}`);
  }

  return tagFilePath;
}

export function ListAllTags(): TTagsInMemory[] {
  const targetPath = GetTagFolderFullPath();

  return fs
    .readdirSync(targetPath)
    .filter(file => {
      const fileStats = fs.statSync(path.join(targetPath, file));
      return !fileStats.isDirectory() && file.endsWith('.tag.md');
    })
    .map(file => {
      return {
        tagName: file,
        tagPath: path.join(targetPath, file),
      };
    });
}
