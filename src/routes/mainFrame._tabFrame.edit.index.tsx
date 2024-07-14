import { createFileRoute } from '@tanstack/react-router';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/mainFrame/_tabFrame/edit/')({
  // re-acquiring all opened files again, will be pushed to the frame
  loader: async () => {
    return IPCRenderSide.send(IPCActions.DATA.PUSH_ALL_OPENED_FILES);
  },
});
