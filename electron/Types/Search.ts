export enum ESearchTypes {
  Content = 'Content',
  File = 'File',
  Tag = 'Tag',
}

export type TSearchBarAction = {
  text: string;
  actionMappingKey: string; //key to get the function from mapping file
  actionArgs?: [any]; //additional args to pass to the function
  callback?: Function; //cannot send function through IPC, this field is added with mapping
};

export type TSearchTarget = {
  searchText?: string;
  placeHolder?: string;
  searchType?: ESearchTypes;
  additionalAction?: TSearchBarAction[];
};
