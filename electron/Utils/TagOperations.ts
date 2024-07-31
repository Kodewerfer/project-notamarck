import fs from 'node:fs';
import { CheckFileRenameOnDup } from './FileOperations.ts';
import { GetCurrentWorkspace } from '../Storage/Globals.ts';
import path from 'node:path';
import { TTagsInMemory } from '../Types/Tags.ts';

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
  const tagList = [];

  for (const file of dirContent) {
    const fileStats = await fs.promises.stat(path.join(targetPath, file));
    const tagFileContentRaw = await fs.promises.readFile(path.join(targetPath, file), 'utf8');
    if (!fileStats.isDirectory() && file.endsWith('.tag.md')) {
      tagList.push({
        tagFileName: file,
        tagPath: path.join(targetPath, file),
        tagFileContentRaw: tagFileContentRaw,
      });
    }
  }

  return tagList;
}

export async function ReadTagAsync(tagPath: string): Promise<TTagsInMemory> {
  await fs.promises.access(tagPath); // will throw on error;

  const tagFileContentRaw = await fs.promises.readFile(tagPath, 'utf8');

  const baseName = path.basename(tagPath);

  return {
    tagFileName: baseName,
    tagPath: tagPath,
    tagContentRaw: tagFileContentRaw,
  };
}
