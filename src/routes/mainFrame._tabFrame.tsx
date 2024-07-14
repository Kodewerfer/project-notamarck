import { createFileRoute } from '@tanstack/react-router';
import TabFrame from 'component/TabFrame.tsx';
import { useEffect } from 'react';

import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/mainFrame/_tabFrame')({
  component: TabFrameWrapper,
});

function TabFrameWrapper() {
  useEffect(() => {
    console.log('tabframe wrapper: getting all opened files ');
    IPCRenderSide.send(IPCActions.DATA.PUSH_ALL_OPENED_FILES);
  }, []);
  return (
    <>
      <TabFrame />
    </>
  );
}
