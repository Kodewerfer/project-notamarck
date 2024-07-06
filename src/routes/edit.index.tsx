import { createFileRoute } from '@tanstack/react-router';
import TabFrame from 'component/TabFrame.tsx';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

export const Route = createFileRoute('/edit/')({
  loader: async () => {
    return (await IPCRenderSide.invoke(IPCActions.DATA.GET_ALL_OPENED_FILES)) ?? [];
  },
  component: TabFrameWrapper,
});

const { IPCRenderSide } = window;

function TabFrameWrapper() {
  return (
    <>
      <TabFrame InitialTabsData={Route.useLoaderData()} />
    </>
  );
}
