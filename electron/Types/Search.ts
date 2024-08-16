export enum ESearchTypes {
  Content="Content",
  File = 'File',
  Tag = 'Tag',
}

export type TSearchTarget = {
  searchText?: string;
  placeHolder?: string;
  searchType?: ESearchTypes;
};