import { createFileRoute, redirect } from '@tanstack/react-router';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { removeLastPartOfPath } from '@/util/helper.ts';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/FileFrame/_tabFrame/edit/$filepath')({
  // notify main of the new file, main process will then push all opened files to the tab frame
  loader: async ({ params: { filepath } }) => {
    const currentActiveFile = await IPCRenderSide.invoke(IPCActions.DATA.GET_ACTIVE_FILE);
    if (currentActiveFile?.fullPath === filepath) {
      console.log('File already active, abort reading');
      return;
    }

    const currentWorkspace = await IPCRenderSide.invoke(IPCActions.APP.GET_WORK_SPACE);
    // check for the file's folder
    if (removeLastPartOfPath(filepath) !== currentWorkspace) {
      console.warn('Opened file not in workspace, redirected to index');
      redirect({
        to: '/FileFrame',
      });
      return;
    }

    try {
      const OpenedFile = await IPCRenderSide.invoke(IPCActions.FILES.READ_AND_ADD_TO_OPENED_FILE, filepath);

      return IPCRenderSide.send(IPCActions.DATA.CHANGE_ACTIVE_FILE, OpenedFile);
    } catch (e) {
      console.warn('Opened file error, redirected to index');
      redirect({
        to: '/FileFrame',
      });
    }
  },
  gcTime: 0,
  staleTime: 0,
  shouldReload: true,
});
