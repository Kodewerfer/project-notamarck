import { createFileRoute } from '@tanstack/react-router';
import TabFrame from 'component/TabFrame.tsx';
import { useEffect } from 'react';

import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/FileFrame/_tabFrame')({
  component: TabFrameWrapper,
});

function TabFrameWrapper() {
  useEffect(() => {
    IPCRenderSide.send(IPCActions.DATA.PUSH_ALL_OPENED_FILES);
  }, []);
  return (
    <>
      <TabFrame />
    </>
  );
}
