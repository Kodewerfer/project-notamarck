import { createFileRoute, Navigate } from '@tanstack/react-router';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { useEffect, useState } from 'react';
import { TTagsInMemory } from 'electron-src/Types/Tags.ts';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/TagFrame/$tagPath')({
  loader: async ({ params: { tagPath } }) => {
    return await IPCRenderSide.invoke(IPCActions.DATA.SET_TAG_AS_EDITING, tagPath);
  },
  staleTime: 0,
  gcTime: 0,
  shouldReload: true,
  component: TagEdit,
});

function TagEdit() {
  const [EditingTag, setEditingTag] = useState<TTagsInMemory | undefined | null>(Route.useLoaderData());

  // bind events
  useEffect(() => {
    const unbindTagEditingChange = IPCRenderSide.on(
      IPCActions.DATA.PUSH.EDITING_TAG_CHANGED,
      (_, payload: TTagsInMemory | null) => {
        setEditingTag(payload);
      },
    );

    return () => {
      unbindTagEditingChange();
    };
  }, []);

  return (
    <div>
      {/*return to the listing page if the tag is invalid*/}
      {!EditingTag && <Navigate to={'/TagFrame'} />}
      {/*Editing page*/}
      tag edit
      <div>{EditingTag && EditingTag.tagPath}</div>
    </div>
  );
}
