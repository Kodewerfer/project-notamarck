// used for "opened files" that records content
export type TFileInMemory = {
  filename: string;
  fullPath: string;
  title?: string;
  content?: string;
};
