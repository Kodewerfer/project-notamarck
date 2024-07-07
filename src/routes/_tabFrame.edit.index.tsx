import { createFileRoute } from '@tanstack/react-router';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/_tabFrame/edit/')({
  loader: async () => {
    return IPCRenderSide.send(IPCActions.DATA.PUSH_ALL_OPENED_FILES);
  },
});
