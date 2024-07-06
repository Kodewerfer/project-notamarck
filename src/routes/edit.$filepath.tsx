import { createFileRoute, useLayoutEffect } from '@tanstack/react-router';
import MarkdownEditor from 'component/MarkdownEditor.tsx';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import TabFrame, { TTabItems } from 'component/TabFrame.tsx';
import { useEffect, useState } from 'react';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/edit/$filepath')({
  loader: async ({ params: { filepath } }) => {
    await IPCRenderSide.invoke(IPCActions.FILES.READ_MD_PATH, filepath);
    return (await IPCRenderSide.invoke(IPCActions.DATA.GET_ALL_OPENED_FILES)) ?? [];
  },
  component: TabFrameWrapper,
});

// Using a wrapper here so that Route's loader data can be passed down easier and in the same file without cross importing
function EditorWrapper() {
  return (
    <>
      <MarkdownEditor MDSource={Route.useLoaderData()} />
    </>
  );
}

function TabFrameWrapper() {
  return (
    <>
      <TabFrame OpenedFiles={Route.useLoaderData()} />
    </>
  );
}
