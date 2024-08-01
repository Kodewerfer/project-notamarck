import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link, Outlet, useLayoutEffect, useNavigate } from '@tanstack/react-router';

import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

import { motion } from 'framer-motion';
import { ArchiveBoxIcon, Cog6ToothIcon, FolderIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/16/solid';
import MainFrameContext from '@/context/MainFrameContext.ts';
import { getLastPartOfPath } from 'component/util/helper.ts';
import SearchBar from 'component/SearchBar.tsx';
import { ESearchTypes, TFileInMemory, TSearchTarget } from 'electron-src/Types/GlobalStorage.ts';
import { TTagsInMemory } from 'electron-src/Types/Tags.ts';
import { TMDFile } from 'electron-src/Types/Files.ts';

const { IPCRenderSide } = window;

export const Route = createFileRoute('/mainFrame')({
  loader: async () => {
    return {
      MD: await ListMdInFolder(),
      Tags: await ListAllTags(),
    };
  },
  component: MainFrame,
});

function MainFrame() {
  const navigate = useNavigate();

  const [currentFolder, setCurrentFolder] = useState('');
  const [MDFiles, setMDFiles] = useState<TMDFile[] | null | undefined>(Route.useLoaderData()?.MD);
  const [TagList, setTagList] = useState<TTagsInMemory[] | null | undefined>(Route.useLoaderData()?.Tags);
  // currentEditingFile is not fetched, it depends on the tab frame and main process pushing
  const [currentEditingFile, setCurrentEditingFile] = useState<TFileInMemory | null>(null);

  const [selectedFilesPaths, setSelectedFilesPaths] = useState<string[]>([]); //used in styling elements
  const selectedFilesPathRef = useRef<string[]>([]); // copy of the state version, actually used as data package

  const [filepathToRename, setFilepathToRename] = useState<string | null>('');
  const [newPendingName, setNewPendingName] = useState('');
  const RenamingInputRef = useRef<HTMLInputElement | null>(null);

  // passing down to children
  const ScrollAreaRef = useRef<HTMLDivElement | null>(null);

  // Initial loading
  useEffect(() => {
    if (MDFiles) return;
    (async () => {
      console.log('Main Frame: No data from loader, re-fetching.');
      const MDData = await ListMdInFolder();
      setMDFiles(MDData);

      // fetch tags
      const allTags = await ListAllTags();
      setTagList(allTags);
    })();
  }, []);

  // bind events
  useLayoutEffect(() => {
    // when active file changes, toggle the "active" mark on item accordingly
    const unbindFileActivationChange = IPCRenderSide.on(
      IPCActions.DATA.PUSH.ACTIVE_FILE_CHANGED,
      (_, payload: TFileInMemory | null) => {
        setCurrentEditingFile(payload);
      },
    );

    // main sent renaming push
    const unbindRenamingFile = IPCRenderSide.on(IPCActions.FILES.PUSH.RENAMING_TARGET_FILE, (_, payload: string) => {
      setFilepathToRename(payload || null);
    });

    const unbindMDListingChange = IPCRenderSide.on(IPCActions.FILES.SIGNAL.MD_LIST_CHANGED, async _ => {
      const MDData = await ListMdInFolder();
      setMDFiles(MDData);
    });

    const unbindTagListingChange = IPCRenderSide.on(IPCActions.FILES.SIGNAL.TAG_LIST_CHANGED, async _ => {
      const MDData = await ListAllTags();
      setTagList(MDData);
    });

    return () => {
      unbindFileActivationChange();
      unbindMDListingChange();
      unbindRenamingFile();
      unbindTagListingChange();
    };
  }, []);

  // set folder name each time
  useEffect(() => {
    (async () => {
      const currentFolder = await IPCRenderSide.invoke(IPCActions.APP.GET_WORK_SPACE);

      setCurrentFolder(getLastPartOfPath(currentFolder));
    })();
  });

  // copy selectedFilesPaths state to the ref
  useEffect(() => {
    selectedFilesPathRef.current = [...selectedFilesPaths];
  }, [selectedFilesPaths]);

  useEffect(() => {
    if (filepathToRename) {
      RenamingInputRef.current?.focus();
    }
  }, [filepathToRename]);

  // Multi-file selection
  function selectFiles(ev: React.MouseEvent, item: TMDFile) {
    if (ev.ctrlKey) {
      if (selectedFilesPaths.includes(item.path)) {
        const filteredFilesPath = selectedFilesPaths.filter(filePath => filePath !== item.path);
        // ref stores data immediately but state may takes time
        selectedFilesPathRef.current = filteredFilesPath;
        setSelectedFilesPaths(filteredFilesPath);
      } else {
        const updatedSelectedFilesPath = [...selectedFilesPaths, item.path];
        selectedFilesPathRef.current = updatedSelectedFilesPath;

        setSelectedFilesPaths(updatedSelectedFilesPath);
      }
      return;
    }

    setSelectedFilesPaths([item.path]);
  }

  function selectFilesRightClick(ev: React.MouseEvent, item: TMDFile) {
    if (ev.ctrlKey) {
      if (!selectedFilesPaths.includes(item.path)) {
        const combinedFilePaths = [...selectedFilesPaths, item.path];
        // ref stores data immediately but state may takes time
        selectedFilesPathRef.current = combinedFilePaths;
        setSelectedFilesPaths(combinedFilePaths);
      }
      return;
    }

    if (!selectedFilesPaths.includes(item.path)) {
      selectedFilesPathRef.current = [item.path];
      setSelectedFilesPaths([item.path]);
    }
  }

  // context menu
  function HandleFileContextMenu() {
    IPCRenderSide.send(IPCActions.MENU.SHOW_FILE_OPERATION_MENU, [...selectedFilesPathRef.current]); //use the ref as actual data so it will always be the newest version
  }

  // Rename file
  async function RenameTargetFile(FileFullPath: string) {
    const oldFillPath = FileFullPath;
    const NewFileName = newPendingName;

    if (!NewFileName || NewFileName.trim() === '') return;
    console.log('old:', oldFillPath, 'new:', NewFileName);

    try {
      await IPCRenderSide.invoke(IPCActions.FILES.CHANGE_TARGET_FILE_NAME, oldFillPath, NewFileName);
    } catch (e) {
      await IPCRenderSide.invoke(IPCActions.DIALOG.SHOW_MESSAGE_DIALOG, {
        type: 'error',
        message: `Error creating new file`,
        detail: `${e}`,
      });
    }

    setNewPendingName('');
    setFilepathToRename(null);
  }

  return (
    <>
      <div className="h-screen w-screen bg-gray-50 antialiased dark:bg-gray-900">
        {/*Sidebar*/}
        <motion.aside
          layout
          className="fixed left-0 top-0 z-50 flex h-screen w-96 border-r border-gray-200 dark:border-none dark:bg-slate-800"
        >
          {/*side buttons*/}
          <ul className="relative flex h-screen w-14 flex-col align-middle">
            <li className="is-active group mb-1 flex justify-center py-4 font-semibold dark:text-blue-50">
              {/* mind the group-[.is-active] */}
              <ArchiveBoxIcon className="size-8 group-hover:size-10 group-[.is-active]:size-10" />
            </li>
            {/*the "setting button"*/}
            <li className="group absolute bottom-0 left-0 flex w-full justify-center py-4 font-semibold dark:text-blue-50">
              <Link className="block grow pl-1.5" to="/settings">
                <Cog6ToothIcon className={'size-8 group-hover:size-10'} />
              </Link>
            </li>
          </ul>

          {/*file list*/}
          <div className="grow bg-slate-100 dark:bg-slate-700 dark:text-blue-50">
            <section className="flex cursor-pointer bg-slate-200 px-2 py-1.5 font-medium dark:bg-slate-600">
              <FolderIcon className="size-4 self-center" />
              <span className="grow pl-1.5">{currentFolder}</span>
            </section>
            {/*Add new file button*/}
            <section
              className={
                'flex cursor-pointer content-center justify-center bg-slate-100/30 py-1.5 dark:bg-slate-500/20'
              }
              onClick={() => {
                const NewFileSearch: TSearchTarget = {
                  placeHolder: 'New File',
                  searchType: ESearchTypes.File,
                };
                IPCRenderSide.send(IPCActions.DATA.SET_NEW_SEARCH_TARGET, NewFileSearch);
              }}
            >
              <PlusIcon className={'size-6'} />
            </section>
            {/*File listing, context menu is bind here, so it is for the best that this is fit to content*/}
            <ul
              className="w-full px-1.5"
              onContextMenu={ev => {
                ev.preventDefault();
                HandleFileContextMenu();
              }}
            >
              {/*TODO:Remove*/}
              <li className="is-editing group flex px-2 py-1.5 pl-6 hover:bg-slate-200 dark:hover:bg-slate-500">
                <Link className="block grow pl-1.5" to="/mainFrame/edit">
                  Test-Back to Index
                </Link>
              </li>
              {/*File Listings*/}
              {MDFiles &&
                MDFiles.map(item => {
                  // when renaming
                  if (filepathToRename === item.path)
                    return (
                      <li
                        className={`file-listing group my-1 flex cursor-default select-none rounded-lg px-2 py-1 pl-6 hover:bg-slate-200 dark:hover:bg-slate-500`}
                        key={item.path}
                      >
                        <input
                          ref={RenamingInputRef}
                          type={'text'}
                          placeholder={item.name}
                          onBlur={() => {
                            // cancel renaming file
                            setNewPendingName('');
                            setFilepathToRename(null);
                          }}
                          onKeyUp={async ev => {
                            if (ev.key === 'Enter') await RenameTargetFile(item.path);
                          }}
                          value={newPendingName}
                          onChange={ev => setNewPendingName(ev.target.value)}
                          className={
                            'grow border-0 bg-gray-50 py-1.5 pl-2 text-gray-900 placeholder:text-gray-400 focus:outline-0 focus:ring-0 sm:text-sm sm:leading-6'
                          }
                        />
                      </li>
                    );
                  // normal listing
                  return (
                    <li
                      className={`${currentEditingFile?.fullPath === item.path ? 'is-editing' : ''} ${selectedFilesPaths.includes(item.path) ? 'bg-slate-300 dark:bg-slate-600' : ''} file-listing group my-1 flex cursor-default select-none rounded-lg px-2 py-1 pl-6 hover:bg-slate-200 dark:hover:bg-slate-500`}
                      key={item.path}
                      onClick={ev => selectFiles(ev, item)}
                      onContextMenu={ev => {
                        selectFilesRightClick(ev, item);
                      }}
                      onDoubleClick={() => {
                        navigate({ to: '/mainFrame/edit/$filepath', params: { filepath: item.path } });
                      }}
                    >
                      <ArrowRightIcon className="mr-2 hidden size-3 self-center group-hover:text-blue-50 group-[.is-editing]:flex" />
                      {/*filepathToRename*/}
                      <span>{item.name}</span>
                    </li>
                  );
                })}
            </ul>
          </div>
        </motion.aside>

        {/*Main editor area*/}
        <main className="ml-96 flex h-screen flex-col dark:bg-slate-200">
          {/*all-in-one Search bar component*/}
          <SearchBar MDList={MDFiles} TagsList={TagList} />
          {/*the main display area*/}
          <div
            ref={ScrollAreaRef}
            className={
              'mainframe-display z-10 h-full overflow-auto scroll-smooth focus:scroll-auto dark:bg-slate-600 dark:text-blue-50'
            }
          >
            <MainFrameContext.Provider value={ScrollAreaRef}>
              <Outlet />
            </MainFrameContext.Provider>
          </div>
        </main>
      </div>
    </>
  );
}

async function ListMdInFolder() {
  let MdFiles = [];
  try {
    MdFiles = await IPCRenderSide.invoke(IPCActions.FILES.LIST_CURRENT_PATH_MD);
  } catch (e) {
    console.error(e);
  }
  return MdFiles;
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
