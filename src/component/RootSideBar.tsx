import { Link, useMatches } from '@tanstack/react-router';
import { ArchiveBoxIcon, Cog6ToothIcon, TagIcon, WalletIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { TTagsInMemory } from 'electron-src/Types/Tags.ts';

const { IPCRenderSide } = window;

export function RootSideBar() {
  const [editingTag, setEditingTag] = useState<TTagsInMemory | null>(null);

  // router's location info
  const matches = useMatches();

  // when route changes
  useEffect(() => {
    //unused for now
  }, [matches]);

  // Event Binding
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

  // init conditional side bar buttons
  useEffect(() => {
    (async () => {
      setEditingTag(await IPCRenderSide.invoke(IPCActions.DATA.GET_EDITING_TAG));
    })();
  }, []);

  const bNotAtIndex = matches[matches.length - 1] && matches[matches.length - 1].id !== '/';
  return (
    <aside
      className={`fixed left-0 top-0 z-50 h-full w-14 transition-colors ease-in ${bNotAtIndex ? 'bg-gray-50 dark:bg-gray-900' : 'bg-gray-50/75 py-6 dark:bg-slate-800/75'}`}
    >
      {/*side buttons*/}
      {bNotAtIndex && (
        <ul className="relative z-50 flex h-full w-14 flex-col align-middle">
          <li className="group mb-1 flex justify-center py-4 font-semibold dark:text-blue-50">
            <Link className="group relative block grow pl-1.5" to="/FileFrame/edit">
              <WalletIcon className="size-10 group-hover:size-10" />
              <div
                className={
                  'invisible absolute left-16 top-0 z-50 w-fit text-nowrap rounded bg-gray-900 px-2 py-1 text-white group-hover:visible'
                }
              >
                Editor
              </div>
            </Link>
          </li>
          <li className="group mb-1 flex justify-center py-4 font-semibold dark:text-blue-50">
            <Link className="group relative block grow pl-1.5" to="/TagFrame">
              <ArchiveBoxIcon className="size-10 group-hover:size-10" />
              <div
                className={
                  'invisible absolute left-16 top-0 z-50 w-fit text-nowrap rounded bg-gray-900 px-2 py-1 text-white group-hover:visible'
                }
              >
                Tags
              </div>
            </Link>
          </li>
          {/*the Tag detail page*/}
          {editingTag && (
            <li className="group mb-1 flex justify-center py-4 font-semibold dark:text-blue-50">
              <Link
                className="group relative block grow pl-1.5"
                to="/TagFrame/$tagPath"
                params={{ tagPath: editingTag.tagPath }}
              >
                <TagIcon className="size-10 group-hover:size-10" />
                <div
                  className={
                    'invisible absolute left-16 top-0 z-50 w-fit text-nowrap rounded bg-gray-900 px-2 py-1 text-white group-hover:visible'
                  }
                >
                  Tags Editing
                </div>
              </Link>
            </li>
          )}

          {/*the "setting button"*/}
          <li className="group absolute bottom-0 left-0 flex w-full justify-center py-4 font-semibold dark:text-blue-50">
            <Link className="group relative block grow pl-1.5" to="/settings">
              <Cog6ToothIcon className={'size-10 group-hover:size-10'} />
              <div
                className={
                  'invisible absolute left-16 top-0 z-50 w-fit text-nowrap rounded bg-gray-900 px-2 py-1 text-white group-hover:visible'
                }
              >
                Setting
              </div>
            </Link>
          </li>
        </ul>
      )}
    </aside>
  );
}
