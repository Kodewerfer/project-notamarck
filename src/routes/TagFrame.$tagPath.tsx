import { createFileRoute, Navigate } from '@tanstack/react-router';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { useState } from 'react';
import { TTagsInMemory } from 'electron-src/Types/Tags.ts';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/TagFrame/$tagPath')({
  loader: async ({ params: { tagPath } }) => {
    return await IPCRenderSide.invoke(IPCActions.DATA.SET_TAG_AS_EDITING, tagPath);
  },
  component: TagEdit,
});

function TagEdit() {
  const [TagInfo, setTagInfo] = useState<TTagsInMemory | undefined>(Route.useLoaderData());

  return (
    <div>
      {/*return to the listing page if the tag is invalid*/}
      {!TagInfo && <Navigate to={'/TagFrame'} />}
      {/*Editing page*/}
      tag edit
      <div>{TagInfo && TagInfo.tagPath}</div>
    </div>
  );
}
