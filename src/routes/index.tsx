import { createFileRoute, useLayoutEffect, useNavigate } from '@tanstack/react-router';
import { FolderOpenIcon } from '@heroicons/react/24/outline';
import { getLastPartOfPath } from '@/util/helper.ts';
import { FolderIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import log from 'electron-log';
import { XMarkIcon } from '@heroicons/react/16/solid';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

const { IPCRenderSide } = window;

function IndexComponent() {
  const [currentFolderPath, setCurrentFolderPath] = useState('');
  const [recentFolders, setRecentFolders] = useState<string[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setCurrentFolderPath(await IPCRenderSide.invoke(IPCActions.APP.GET_WORK_SPACE));
      const recentFolders = await IPCRenderSide.invoke(IPCActions.APP.GET_RECENT_WORK_SPACES);
      setRecentFolders(recentFolders);
    })();
  }, []);

  useLayoutEffect(() => {
    const unbindRecentWorkspacesChange = IPCRenderSide.on(
      IPCActions.APP.PUSH.RECENT_WORK_SPACES_CHANGED,
      (_, payload) => {
        if (Array.isArray(payload)) setRecentFolders([...payload]);
      },
    );
    return () => {
      unbindRecentWorkspacesChange();
    };
  }, []);

  async function ClickedOnRecentFolders(targetFolder: string) {
    try {
      await IPCRenderSide.invoke(IPCActions.APP.SET_WORK_SPACE, targetFolder);
    } catch (e) {
      console.error(e);
      log.error(e);
      const buttonPressed = await IPCRenderSide.invoke(IPCActions.DIALOG.SHOW_MESSAGE_DIALOG, {
        type: 'error',
        message: `Error switching workspace, Remove it from the list?`,
        detail: `${e}`,
        buttons: ['yes', 'no'],
      });
      if (buttonPressed === 0) {
        IPCRenderSide.send(IPCActions.APP.REMOVE_FROM_RECENT_WORK_SPACES, targetFolder);
      }
      return;
    }
    setCurrentFolderPath(await IPCRenderSide.invoke(IPCActions.APP.GET_WORK_SPACE));
    navigate({ to: '/FileFrame/edit' });
  }

  async function ShowFolderSelectionDialog() {
    const DIRPath = await IPCRenderSide.invoke(IPCActions.DIALOG.SHOW_SELECTION_DIR);
    //Invalid
    if (!DIRPath || DIRPath.length > 1) return;

    // Save and close files from the current workspace
    try {
      await IPCRenderSide.invoke(IPCActions.DATA.SAVE_ALL_OPENED_FILES);
    } catch (e) {
      const buttonPressed = await IPCRenderSide.invoke(IPCActions.DIALOG.SHOW_MESSAGE_DIALOG, {
        type: 'error',
        message: `Error saving files from previous, continue switching workspace?`,
        detail: `${e}`,
        buttons: ['yes', 'no'],
      });
      if (buttonPressed === 1) return;
      console.error(e);
      log.error(e);
    }

    // Only one folder should be allowed to choose at a time
    try {
      await IPCRenderSide.invoke(IPCActions.APP.SET_WORK_SPACE, DIRPath[0]);
    } catch (e) {
      console.error(e);
      log.error(e);
      await IPCRenderSide.invoke(IPCActions.DIALOG.SHOW_MESSAGE_DIALOG, {
        type: 'error',
        message: `Error switching workspace`,
        detail: `${e}`,
      });
      return;
    }
    setCurrentFolderPath(await IPCRenderSide.invoke(IPCActions.APP.GET_WORK_SPACE));
    navigate({ to: '/FileFrame/edit' });
  }

  // Index for the whole app
  return (
    <>
      {/*wrapper*/}
      <div
        className={
          'index-wrapper h-screen w-full cursor-pointer select-none content-center justify-center gap-28 overflow-auto bg-gray-50/75 py-6 dark:bg-slate-800/75'
        }
      >
        {/*inner*/}
        <div
          className={
            'index-inner relative m-auto ms-auto flex h-full w-11/12 min-w-[640px] cursor-auto rounded-2xl bg-gray-100 px-3.5 py-6 antialiased shadow-md dark:bg-slate-500 dark:text-blue-50'
          }
        >
          {/* recent folders */}
          <div className={'flex h-full w-2/5 min-w-48 grow flex-col'}>
            <h1 className={'mx-4 mb-2 h-12 border-b-2 pb-2 text-center text-lg font-semibold dark:border-slate-400'}>
              Recent Workspaces
            </h1>
            <ul className={'w-full basis-full overflow-auto text-right'}>
              {recentFolders.reverse().map(item => (
                <li
                  key={item}
                  onClick={() => ClickedOnRecentFolders(item)}
                  className={
                    'group relative my-2.5 mb-2 flex w-full cursor-pointer justify-end from-gray-200 to-gray-100 py-3.5 pr-2.5 hover:rounded-lg hover:bg-gradient-to-r dark:from-slate-500 dark:to-slate-600 dark:hover:shadow-md'
                  }
                >
                  <div className={'truncates w-full max-w-sm'}>
                    <span className={'block w-full truncate pl-2.5 font-semibold dark:drop-shadow'}>
                      {getLastPartOfPath(item)}
                    </span>
                    <span className={'block w-full truncate pl-2.5 text-right text-gray-500 dark:dark:text-gray-200'}>
                      {item}
                    </span>
                  </div>
                  <FolderIcon className={'ml-4 size-5 min-h-5 min-w-5 self-center'} />
                  {/*close button*/}
                  <div
                    className={
                      'absolute left-4 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 group-hover:transition'
                    }
                    onClick={ev => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      IPCRenderSide.send(IPCActions.APP.REMOVE_FROM_RECENT_WORK_SPACES, item);
                    }}
                  >
                    <XMarkIcon className={'size-6'} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/*folder selection*/}
          <div className={'h-full w-3/5 min-w-96 overflow-y-auto overflow-x-hidden pl-4'}>
            {/*current folder*/}
            <div
              onClick={() => navigate({ to: '/FileFrame/edit' })}
              className={
                'mx-6 rounded-lg bg-gradient-to-l from-gray-100 to-gray-200 px-5 py-5 dark:from-slate-500 dark:to-slate-700'
              }
            >
              <section className={'flex text-lg'}>
                <FolderOpenIcon className={'size-6 min-h-6 min-w-6 self-center'} />
                <div className={'grow'}>
                  <span className={'block truncate pl-2.5 font-semibold dark:drop-shadow'}>
                    {getLastPartOfPath(currentFolderPath)}
                  </span>
                  <span className={'block truncate pl-2.5 font-semibold text-gray-500 dark:text-gray-400'}>
                    {currentFolderPath}
                  </span>
                </div>
              </section>
              <div className={'flex flex-col items-center justify-center pt-8'}>
                <button
                  className={
                    'mb-6 w-1/5 min-w-32 max-w-48 rounded-xl bg-gradient-to-tr from-purple-500 to-purple-600 px-5 py-2.5 text-center font-medium text-gray-50 shadow-md sm:text-xs lg:text-xl'
                  }
                  onClick={() => navigate({ to: '/FileFrame/edit' })}
                >
                  Continue
                </button>
                <button
                  className={
                    'w-1/5 min-w-32 max-w-52 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 px-5 py-2.5 text-center font-medium text-gray-50 shadow-md sm:text-xs lg:text-xl'
                  }
                  onClick={ev => {
                    ev.stopPropagation();
                    ShowFolderSelectionDialog();
                  }}
                >
                  Select New Folder
                </button>
              </div>
            </div>
          </div>

          {/* ... */}
        </div>
      </div>
    </>
  );
}
