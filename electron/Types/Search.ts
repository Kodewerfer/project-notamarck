import { TMDFile } from './Files.ts';
import { TTagsInMemory } from './Tags.ts';

export enum ESearchTypes {
  File = 'File',
  Tag = 'Tag',
}

export type TSearchTarget = {
  searchText?: string;
  placeHolder?: string;
  searchType?: ESearchTypes;
};

export type TSearchFilteredData = {
  MDList?: TMDFile[];
  TagList?: TTagsInMemory[];
};
