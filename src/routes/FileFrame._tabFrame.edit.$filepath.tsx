import { createFileRoute, redirect } from '@tanstack/react-router';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { removeLastPartOfPath } from '@/util/helper.ts';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/FileFrame/_tabFrame/edit/$filepath')({
  // notify main of the new file, main process will then push all opened files to the tab frame
  loader: async ({ params: { filepath } }) => {
    const currentWorkspace = await IPCRenderSide.invoke(IPCActions.APP.GET_WORK_SPACE);
    // check for the file's folder
    if (removeLastPartOfPath(filepath) !== currentWorkspace) {
      console.warn('Opened file not in workspace, redirected to index');
      redirect({
        to: '/FileFrame',
      });
      return;
    }
    const OpenedFile = await IPCRenderSide.invoke(IPCActions.FILES.READ_MD_FROM_PATH, filepath);
    IPCRenderSide.send(IPCActions.DATA.CHANGE_ACTIVE_FILE, OpenedFile);
    return OpenedFile;
  },
  gcTime: 0,
  staleTime: 0,
  shouldReload: true,
});
