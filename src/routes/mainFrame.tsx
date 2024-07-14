import { useEffect, useState } from 'react';

import { createFileRoute, Link, Outlet } from '@tanstack/react-router';

import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import * as pathBrowserify from 'path-browserify';
import { TMDFile } from 'electron-src/IPC/IPC-Handlers.ts';

import { ArchiveBoxIcon, Cog6ToothIcon, FolderIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/16/solid';

const { IPCRenderSide } = window;

export const Route = createFileRoute('/mainFrame')({
  loader: async () => {
    return await ListMdInFolder();
  },
  component: MainFrame,
});

function MainFrame() {
  const [MDFiles, setMDFiles] = useState<TMDFile[] | null>(Route.useLoaderData());

  useEffect(() => {
    if (MDFiles) return;
    (async () => {
      console.log('Main Frame: No data from loader, re-fetching.');
      const MDData = await ListMdInFolder();
      setMDFiles(MDData);
    })();
  }, []);

  return (
    <>
      <div className="h-screen w-screen bg-gray-50 antialiased dark:bg-gray-900">
        {/*Sidebar*/}
        <aside className="fixed left-0 top-0 z-50 flex h-screen w-96 border-r border-gray-200 dark:border-none dark:bg-slate-800">
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
              <span className="grow pl-1.5">Folder name</span>
            </section>
            <ul className="w-full">
              <li className="is-editing group flex px-2 py-1.5 pl-6 hover:bg-slate-200 dark:hover:bg-slate-500">
                <Link className="block grow pl-1.5" to="/mainFrame/edit">
                  Test-Back to Index
                </Link>
              </li>
              {MDFiles &&
                MDFiles.map(item => {
                  return (
                    <li
                      className="is-editing group flex px-2 py-1.5 pl-6 hover:bg-slate-200 dark:hover:bg-slate-500"
                      key={item.path}
                    >
                      {/* mind the group-[.is-editing] */}
                      {/* Arrow only shows if the item is being edited */}
                      <ArrowRightIcon className="hidden size-3 self-center group-hover:text-blue-50 group-[.is-editing]:flex" />
                      <Link
                        className="block grow pl-1.5"
                        to="/mainFrame/edit/$filepath"
                        params={{
                          filepath: item.path,
                        }}
                      >
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        </aside>

        {/*Main editor area*/}
        <main className="ml-96 flex h-screen flex-col dark:bg-slate-200">
          {/*top nav may expand while searching */}
          <nav
            className={
              'light:border-b z-40 flex w-full border-gray-200 px-4 py-2.5 dark:bg-slate-700 dark:text-blue-50'
            }
          >
            <MagnifyingGlassIcon className={'size-6 self-center'} />
            <input
              type={'text'}
              placeholder={'Search text'}
              className={
                'grow border-0 bg-transparent py-1.5 pl-2 text-gray-900 placeholder:text-gray-400 focus:outline-0 focus:ring-0 sm:text-sm sm:leading-6 dark:text-blue-50'
              }
            />
          </nav>

          {/*the main display area*/}
          <div className={'grow overflow-auto scroll-smooth focus:scroll-auto dark:bg-slate-600 dark:text-blue-50'}>
            <Outlet />
          </div>
        </main>
      </div>
      {/*TODO: delete*/}
      {/*<TanStackRouterDevtools />*/}
    </>
  );
}

async function ListMdInFolder(folderPath = '/testfolder', parentFolderPath?: string) {
  let MdFiles = [];
  try {
    if (parentFolderPath === undefined) parentFolderPath = await IPCRenderSide.invoke(IPCActions.APP.GET_APP_PATH);
    if (!parentFolderPath) return;
    MdFiles = await IPCRenderSide.invoke(
      IPCActions.FILES.LIST_CURRENT_PATH_MD,
      pathBrowserify.join(parentFolderPath, folderPath),
    );
  } catch (e) {
    console.error(e);
  }
  return MdFiles;
}
