/**
 * Tag related global storage
 */
import { TTagsInMemory } from '../Types/Tags.ts';

let _Tags_list_Index: TTagsInMemory[] = []; //only an index keeping the most basic info

export function SetTagList(newList: TTagsInMemory[]) {
  _Tags_list_Index = [...newList];
}
