import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FolderOpenIcon } from '@heroicons/react/24/outline';
import { getLastPartOfPath } from 'component/util/helper.ts';
import { FolderIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

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

  async function ClickedOnRecentFolders(targetFolder: string) {
    try {
      await IPCRenderSide.invoke(IPCActions.APP.SET_WORK_SPACE, targetFolder);
    } catch (e) {
      console.error(e);
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
    }

    // Only one folder should be allowed to choose at a time
    try {
      await IPCRenderSide.invoke(IPCActions.APP.SET_WORK_SPACE, DIRPath[0]);
    } catch (e) {
      console.error(e);
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
          'index-wrapper h-screen w-full cursor-pointer select-none content-center justify-center gap-28 overflow-hidden bg-gray-50/75 py-6 dark:bg-slate-800/75'
        }
      >
        {/*inner*/}
        <div
          className={
            'index-inner relative m-auto ms-auto flex h-full w-5/6 cursor-auto rounded-2xl bg-gray-100 px-3.5 py-6 antialiased shadow-2xl dark:bg-slate-500 dark:text-blue-50'
          }
        >
          {/* recent folders */}
          <div className={'flex h-full w-full max-w-xl flex-col'}>
            <h1 className={'mx-4 mb-2 h-12 border-b-2 pb-2 text-center text-lg font-semibold dark:border-slate-400'}>
              Recent Workspaces
            </h1>
            <ul className={'w-full grow basis-full overflow-auto text-right'}>
              {recentFolders.reverse().map(item => (
                <li
                  key={item}
                  onClick={() => ClickedOnRecentFolders(item)}
                  className={
                    'my-2.5 mb-2 flex cursor-pointer from-gray-200 to-gray-100 py-3.5 pr-2.5 hover:rounded-lg hover:bg-gradient-to-r dark:from-slate-500 dark:to-slate-600 dark:hover:shadow-md'
                  }
                >
                  <div className={'grow'}>
                    <span className={'block truncate pl-2.5 font-semibold dark:drop-shadow'}>
                      {getLastPartOfPath(item)}
                    </span>
                    <span className={'block truncate pl-2.5 text-gray-500 dark:dark:text-gray-200'}>{item}</span>
                  </div>
                  <FolderIcon className={'ml-4 size-5 min-h-5 min-w-5 self-center'} />
                </li>
              ))}
            </ul>
          </div>

          {/*folder selection*/}
          <div className={'h-full w-full grow overflow-y-auto overflow-x-hidden pl-4'}>
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
