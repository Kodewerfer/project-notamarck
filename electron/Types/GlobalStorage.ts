export enum ESearchTypes {
  File = 'File',
  Tag = 'Tag',
}

// the main search bar
export type TSearchTarget = {
  searchText?: string;
  placeHolder?: string;
  searchType?: ESearchTypes; //todo: tags or else
};

export type TFileInMemory = {
  filename: string;
  fullPath: string;
  title?: string;
  content?: string;
};
