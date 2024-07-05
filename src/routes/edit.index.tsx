import { createFileRoute } from '@tanstack/react-router';
import TabFrame, { TTabItems } from 'component/TabFrame.tsx';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

export const Route = createFileRoute('/edit/')({
  loader: async () => {
    return (await ipcRenderer.invoke(IPCActions.DATA.GET_ALL_OPENED_FILES)) ?? [];
  },
  component: TabFrameWrapper,
});

const { ipcRenderer } = window;

function TabFrameWrapper() {
  return (
    <>
      <TabFrame OpenedFiles={Route.useLoaderData()} />
    </>
  );
}
