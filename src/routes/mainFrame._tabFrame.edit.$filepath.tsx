import { createFileRoute } from '@tanstack/react-router';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/mainFrame/_tabFrame/edit/$filepath')({
  // notify main of the new file, main process will then push all opened files to the tab frame
  loader: async ({ params: { filepath } }) => {
    const OpenedFile = await IPCRenderSide.invoke(IPCActions.FILES.READ_MD_FROM_PATH, filepath);
    IPCRenderSide.send(IPCActions.FILES.CHANGE_ACTIVE_FILE, OpenedFile);
    return OpenedFile;
  },
});
