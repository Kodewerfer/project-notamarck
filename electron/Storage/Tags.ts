/**
 * Tag related global storage
 */
import { TTagsInMemory } from '../Types/Tags.ts';

const _Tags_Map: Map<string, TTagsInMemory> = new Map(); //only an index keeping the most basic info

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
