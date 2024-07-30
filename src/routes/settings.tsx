import { useEffect, useState } from 'react';
import { createFileRoute, useLayoutEffect, useRouter } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/16/solid';
import { FolderOpenIcon } from '@heroicons/react/24/outline';
import { FolderIcon } from '@heroicons/react/24/solid';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { getLastPartOfPath } from 'component/util/helper.ts';

export const Route = createFileRoute('/settings')({
  component: Settings,
});

const { IPCRenderSide } = window;

function Settings() {
  const [currentFolderPath, setCurrentFolderPath] = useState('');
  const [recentFolders, setRecentFolders] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setCurrentFolderPath(await GetWorkspace());
      const recentFolders = await IPCRenderSide.invoke(IPCActions.APP.GET_RECENT_WORK_SPACES);
      setRecentFolders(recentFolders);
    })();
  }, []);

  // bind server events
  useLayoutEffect(() => {
    const unbindWorkspaceChange = IPCRenderSide.on(IPCActions.APP.PUSH.WORK_SPACE_CHANGED, (_, payload) => {
      if (String(payload) !== currentFolderPath) setCurrentFolderPath(payload);
    });

    const unbindRecentWorkspacesChange = IPCRenderSide.on(
      IPCActions.APP.PUSH.RECENT_WORK_SPACES_CHANGED,
      (_, payload) => {
        if (Array.isArray(payload)) setRecentFolders([...payload]);
      },
    );

    return () => {
      unbindWorkspaceChange();
      unbindRecentWorkspacesChange();
    };
  }, []);

  async function PromptToGoBack() {
    const buttonPressed = await IPCRenderSide.invoke(IPCActions.DIALOG.SHOW_MESSAGE_DIALOG, {
      type: 'question',
      message: `Back to workspace now? `,
      buttons: ['yes', 'no'],
    });
    if (buttonPressed === 0) router.history.back();
  }

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
    setCurrentFolderPath(await GetWorkspace());
    await PromptToGoBack();
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

    await IPCRenderSide.invoke(IPCActions.DATA.CLOSE_ALL_OPENED_FILES);

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
    setCurrentFolderPath(await GetWorkspace());
    await PromptToGoBack();
  }

  return (
    <>
      {/*wrapper*/}
      <div
        className={
          'setting-wrapper h-full w-full cursor-pointer content-center justify-center gap-28 overflow-hidden bg-slate-800/75'
        }
      >
        {/*inner*/}
        <div
          className={
            'setting-window relative m-auto ms-auto flex h-5/6 w-11/12 cursor-auto rounded-2xl bg-gray-100 px-3.5 py-6 antialiased shadow-2xl'
          }
        >
          {/*close button*/}
          <motion.div
            className={
              'absolute -right-4 -top-4 h-10 w-10 rounded-3xl bg-red-400 text-red-50 shadow-2xl hover:bg-red-600'
            }
          >
            <a
              href={''}
              onClick={ev => {
                ev.preventDefault();
                router.history.back();
              }}
            >
              <XMarkIcon />
            </a>
          </motion.div>
          {/*side bar*/}
          <aside className={'h-full w-48 overflow-hidden'}>
            <div className={'m-auto mb-4 w-11/12 rounded-lg bg-gray-200 px-1.5 py-4 text-center tracking-wide'}>
              <ul>
                <li className={'line-clamp-2 overflow-hidden py-1.5 font-medium hover:rounded-lg hover:bg-gray-300'}>
                  Manage workspaces
                </li>
              </ul>
            </div>
          </aside>
          {/*folder selection*/}
          <div className={'h-full grow overflow-y-auto overflow-x-clip pl-4'}>
            {/*current folder*/}
            <div className={'mx-6 rounded-lg bg-gradient-to-l from-gray-100 to-gray-200 px-5 py-5'}>
              <section className={'flex text-lg'}>
                <FolderOpenIcon className={'size-6 min-h-6 min-w-6 self-center'} />
                <div className={'grow'}>
                  <span className={'block truncate pl-2.5 font-semibold'}>{getLastPartOfPath(currentFolderPath)}</span>
                  <span className={'block truncate pl-2.5 text-gray-500'}>{currentFolderPath}</span>
                </div>
              </section>
              <div className={'flex justify-center pt-5'}>
                <button
                  className={
                    'rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 px-5 py-2.5 text-center font-medium text-gray-50 shadow-md'
                  }
                  onClick={() => ShowFolderSelectionDialog()}
                >
                  Select New Folder
                </button>
              </div>
            </div>

            {/* recent folders */}
            <div>
              {/*search recent*/}
              {/*<div className={'flex'}>*/}
              {/*  <MagnifyingGlassIcon className={'size-6 self-center'} />*/}
              {/*  <input*/}
              {/*    type={'text'}*/}
              {/*    placeholder={'Search text'}*/}
              {/*    className={*/}
              {/*      'grow border-0 bg-transparent py-1.5 pl-2 text-gray-900 placeholder:text-gray-400 focus:outline-0 focus:ring-0 sm:text-sm sm:leading-6'*/}
              {/*    }*/}
              {/*  />*/}
              {/*</div>*/}
              {/*The recent folders*/}
              <ul>
                {recentFolders.reverse().map(item => (
                  <li
                    key={item}
                    onClick={() => ClickedOnRecentFolders(item)}
                    className={
                      'my-2.5 mb-2 flex cursor-pointer from-gray-200 to-gray-100 py-3.5 pl-2.5 hover:rounded-lg hover:bg-gradient-to-r'
                    }
                  >
                    <FolderIcon className={'size-5 min-h-5 min-w-5 self-center'} />
                    <div className={'grow'}>
                      <span className={'block truncate pl-2.5 font-semibold'}>{getLastPartOfPath(item)}</span>
                      <span className={'block truncate pl-2.5 text-gray-500'}>{item}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* ... */}
        </div>
      </div>
    </>
  );
}

async function GetWorkspace() {
  return await IPCRenderSide.invoke(IPCActions.APP.GET_WORK_SPACE);
}
