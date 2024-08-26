import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

const { IPCRenderSide } = window;

const AdditionalSearchBarActions = new Map<string, (...args: any[]) => any>([
  [
    'SaveAs',
    async (OriginalFilePath: string, NewPath: string) => {
      if (NewPath.trim() === '') return;
      IPCRenderSide.send(IPCActions.FILES.SAVE_AS_NEW_FILE, OriginalFilePath, NewPath);
    },
  ],
]);

export default AdditionalSearchBarActions;
