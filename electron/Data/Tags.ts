/**
 * Tag related global storage
 */
import { TTagsInMemory } from '../Types/Tags.ts';

const _Tags_Map: Map<string, TTagsInMemory> = new Map(); //only an index keeping the most basic info

export function GetTagCache(tagFilename: string): TTagsInMemory | undefined {
  return _Tags_Map.get(tagFilename);
}

export function SetTagMap(newItem: TTagsInMemory) {
  _Tags_Map.set(newItem.tagFileName, newItem);
}

export function RemoveFromTagMap(tagName: string) {
  _Tags_Map.delete(tagName);
}

// The "List" is a light-weight version used in search and display, it does not have content
export function GetTagList(): Readonly<TTagsInMemory[]> {
  const tagList = Array.from(_Tags_Map.values()).map(tagVal => {
    return { tagFileName: tagVal.tagFileName, tagPath: tagVal.tagPath };
  });

  return tagList;
}

let _Editing_Tag: TTagsInMemory | null = null;

export function SetEditingTag(newItem: TTagsInMemory | null) {
  if (newItem == null) return (_Editing_Tag = newItem);
  _Editing_Tag = { ...newItem };
}

export function GetEditingTag(): Readonly<TTagsInMemory> | null {
  return _Editing_Tag;
}

// temp var for saving the tag file that's been renamed so that the file monitor won't reset the editing tag
let _Renaming_Tags_Paths: string[] = [];

export function MarkPathForRenaming(renamingPath: string) {
  _Renaming_Tags_Paths.push(renamingPath);
}

export function RenamingTagComplete(tagPath: string) {
  const findIndex = _Renaming_Tags_Paths.findIndex(item => item === tagPath);
  if (findIndex >= 0) _Renaming_Tags_Paths.splice(findIndex, 1);
}

export function CheckForTagRenaming(tagPath: string) {
  const findIndex = _Renaming_Tags_Paths.findIndex(item => item === tagPath);
  return findIndex >= 0;
}
