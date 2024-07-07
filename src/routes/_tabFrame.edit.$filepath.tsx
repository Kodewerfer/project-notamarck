import { createFileRoute } from '@tanstack/react-router';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/_tabFrame/edit/$filepath')({
  loader: async ({ params: { filepath } }) => {
    return await IPCRenderSide.invoke(IPCActions.FILES.READ_MD_PATH, filepath);
  },
});
