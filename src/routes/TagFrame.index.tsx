import { createFileRoute, useLayoutEffect } from '@tanstack/react-router';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { useEffect, useRef, useState } from 'react';
import { TTagsInMemory } from 'electron-src/Types/Tags.ts';
import { TagIcon } from '@heroicons/react/24/outline';
import path from 'path-browserify';
import SearchBar from 'component/SearchBar.tsx';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/TagFrame/')({
  loader: async () => {
    return await ListAllTags();
  },
  component: TagList,
});

function TagList() {
  const [TagList, setTagList] = useState<TTagsInMemory[]>(Route.useLoaderData());

  const [selectedTagsPaths, setSelectedTagsPaths] = useState<string[]>([]); //used in styling elements
  const selectedTagsPathRef = useRef<string[]>([]); // copy of the state version, actually used as data package

  const RenamingInputRef = useRef<HTMLInputElement>(null);
  const [tagPathToRename, setTagPathToRename] = useState<string | null>(null);
  const [newPendingName, setNewPendingName] = useState<string>('');

  // Multi-file selection
  function selectTags(ev: React.MouseEvent, item: TTagsInMemory) {
    if (ev.ctrlKey) {
      if (selectedTagsPaths.includes(item.tagPath)) {
        const filteredFilesPath = selectedTagsPaths.filter(tagPath => tagPath !== item.tagPath);
        // ref stores data immediately but state may takes time
        selectedTagsPathRef.current = filteredFilesPath;
        setSelectedTagsPaths(filteredFilesPath);
      } else {
        const updatedSelectedFilesPath = [...selectedTagsPaths, item.tagPath];
        selectedTagsPathRef.current = updatedSelectedFilesPath;

        setSelectedTagsPaths(updatedSelectedFilesPath);
      }
      return;
    }

    setSelectedTagsPaths([item.tagPath]);
  }

  function selectTagRightClick(ev: React.MouseEvent, item: TTagsInMemory) {
    if (ev.ctrlKey) {
      if (!selectedTagsPaths.includes(item.tagPath)) {
        const combinedFilePaths = [...selectedTagsPaths, item.tagPath];
        // ref stores data immediately but state may takes time
        selectedTagsPathRef.current = combinedFilePaths;
        setSelectedTagsPaths(combinedFilePaths);
      }
      return;
    }

    if (!selectedTagsPaths.includes(item.tagPath)) {
      selectedTagsPathRef.current = [item.tagPath];
      setSelectedTagsPaths([item.tagPath]);
    }
  }

  function ShowTagContextMenu() {
    IPCRenderSide.send(IPCActions.MENU.SHOW_TAG_OPERATION_MENU, selectedTagsPathRef.current);
  }

  async function RenameTargetTag(OldTagPath: string) {
    if (!newPendingName || newPendingName === '' || newPendingName.indexOf('.') !== -1) return;

    try {
      await IPCRenderSide.invoke(IPCActions.FILES.CHANGE_TARGET_TAG_NAME, OldTagPath, newPendingName);
    } catch (e) {
      await IPCRenderSide.invoke(IPCActions.DIALOG.SHOW_MESSAGE_DIALOG, {
        type: 'error',
        message: `Error creating new file`,
        detail: `${e}`,
      });
    }

    setNewPendingName('');
    setTagPathToRename(null);
  }

  useLayoutEffect(() => {
    if (TagList) return;
    (async () => {
      setTagList(await ListAllTags());
    })();
  }, []);

  // Bind to data changing events
  useEffect(() => {
    const unbindRenamingTag = IPCRenderSide.on(
      IPCActions.FILES.PUSH.RENAMING_SELECTED_TAG,
      async (_, renameTargetPath) => {
        setTagPathToRename(renameTargetPath);
        setTimeout(() => {
          if (RenamingInputRef.current) RenamingInputRef.current.focus();
        }, 0);
      },
    );

    const unbindTagListingChange = IPCRenderSide.on(IPCActions.FILES.SIGNAL.TAG_LIST_CHANGED, async _ => {
      const TagData = await ListAllTags();
      setTagList(TagData);
    });

    return () => {
      unbindTagListingChange();
      unbindRenamingTag();
    };
  }, []);

  return (
    <div
      onContextMenu={ev => {
        ev.preventDefault();
        ShowTagContextMenu();
      }}
      className={'TagFrame-root h-full bg-gray-50 px-4 py-8'}
    >
      {/*all-in-one Search bar component*/}
      <SearchBar MDList={null} TagsList={TagList} />
      {/*Tags grid*/}
      <div className={'mt-4 grid select-none grid-cols-6 gap-4 sm:grid-cols-3 sm:gap-2 md:grid-cols-4'}>
        {TagList &&
          TagList.map(tagInfo => (
            <div
              key={tagInfo.tagPath}
              onClick={ev => selectTags(ev, tagInfo)}
              onContextMenu={ev => {
                ev.preventDefault();
                selectTagRightClick(ev, tagInfo);
              }}
              className={`relative cursor-default text-ellipsis rounded-xl py-2 pl-4 pr-4 hover:bg-gray-200 ${selectedTagsPaths.includes(tagInfo.tagPath) ? 'bg-gray-300' : 'bg-gray-100'}`}
            >
              <div className={'flex h-full w-full items-center'}>
                <TagIcon className={'z-10 min-w-14 max-w-14'} />

                {tagPathToRename === tagInfo.tagPath ? (
                  <input
                    className={`h-full w-full border-0 border-b-2 border-transparent bg-transparent py-1.5 pl-2 text-lg font-semibold text-gray-900 placeholder:text-gray-400 focus:border-slate-600 focus:outline-0 focus:ring-0`}
                    ref={RenamingInputRef}
                    type={'text'}
                    placeholder={path.parse(tagInfo.tagFileName).name.split('.')[0]}
                    onBlur={() => {
                      // cancel renaming file
                      setNewPendingName('');
                      setTagPathToRename(null);
                    }}
                    onKeyUp={async ev => {
                      if (ev.key === 'Enter') await RenameTargetTag(tagInfo.tagPath);
                    }}
                    value={newPendingName}
                    onChange={ev => setNewPendingName(ev.target.value)}
                  />
                ) : (
                  <span className={`peer z-10 w-max shrink truncate text-ellipsis pl-4 text-lg font-semibold`}>
                    {path.parse(tagInfo.tagFileName).name.split('.')[0]}
                  </span>
                )}

                <div
                  role="tooltip"
                  className="tooltip invisible absolute -bottom-1/2 left-1/2 z-20 inline-block max-h-12 max-w-full -translate-x-1/2 transform truncate text-wrap rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-opacity duration-300 peer-hover:visible peer-hover:opacity-90 dark:bg-gray-700"
                >
                  {path.parse(tagInfo.tagFileName).name.split('.')[0]}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

async function ListAllTags() {
  let AllTags = [];

  try {
    AllTags = await IPCRenderSide.invoke(IPCActions.FILES.LIST_ALL_TAGS);
  } catch (e) {
    console.log(e);
  }

  return AllTags;
}
