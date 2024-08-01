import { TFileInMemory } from './GlobalStorage.ts';

// For tabFrame
export type TChangedFilesPayload = {
  TargetFilePath: string;
  NewFile: TFileInMemory;
};
