import { TFileInMemory } from './GlobalData.ts';

// For tabFrame
export type TChangedFilesPayload = {
  TargetFilePath: string;
  NewFile: TFileInMemory;
};
