import { Link } from '@tanstack/react-router';
import { ArchiveBoxIcon, Cog6ToothIcon, TagIcon, WalletIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { TTagsInMemory } from 'electron-src/Types/Tags.ts';

const { IPCRenderSide } = window;

export function RootSideBar() {
  const [editingTag, setEditingTag] = useState<TTagsInMemory | null>(null);

  // Event Binding
  useEffect(() => {
    const unbindOpenedFileChange = IPCRenderSide.on(
      IPCActions.DATA.PUSH.EDITING_TAG_CHANGED,
      (_, payload: TTagsInMemory | null) => {
        setEditingTag(payload);
      },
    );

    return () => {
      unbindOpenedFileChange();
    };
  }, []);

  // init conditional side bar buttons
  useEffect(() => {
    (async () => {
      setEditingTag(await IPCRenderSide.invoke(IPCActions.DATA.GET_EDITING_TAG));
    })();
  }, []);

  return (
    <aside className={'fixed left-0 top-0 z-50 h-full w-14 bg-gray-50 dark:bg-gray-900'}>
      {/*side buttons*/}
      <ul className="relative flex h-full w-14 flex-col align-middle">
        <li className="is-active group mb-1 flex justify-center py-4 font-semibold dark:text-blue-50">
          <Link className="block grow pl-1.5" to="/FileFrame/edit">
            {/* mind the group-[.is-active] */}
            <ArchiveBoxIcon className="size-8 group-hover:size-10 group-[.is-active]:size-10" />
          </Link>
        </li>
        <li className="is-active group mb-1 flex justify-center py-4 font-semibold dark:text-blue-50">
          <Link className="block grow pl-1.5" to="/TagFrame">
            {/* mind the group-[.is-active] */}
            <WalletIcon className="size-8 group-hover:size-10 group-[.is-active]:size-10" />
          </Link>
        </li>
        {/*the Tag detail page*/}
        {editingTag && (
          <li className="is-active group mb-1 flex justify-center py-4 font-semibold dark:text-blue-50">
            <Link className="block grow pl-1.5" to="/TagFrame/$tagPath" params={{ tagPath: editingTag.tagPath }}>
              {/* mind the group-[.is-active] */}
              <TagIcon className="size-8 group-hover:size-10 group-[.is-active]:size-10" />
            </Link>
          </li>
        )}

        {/*the "setting button"*/}
        <li className="group absolute bottom-0 left-0 flex w-full justify-center py-4 font-semibold dark:text-blue-50">
          <Link className="block grow pl-1.5" to="/settings">
            <Cog6ToothIcon className={'size-8 group-hover:size-10'} />
          </Link>
        </li>
      </ul>
    </aside>
  );
}
