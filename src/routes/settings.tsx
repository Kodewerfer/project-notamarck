import { createFileRoute } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/16/solid';
import { FolderIcon, FolderOpenIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export const Route = createFileRoute('/settings')({
  component: Settings,
});

function Settings() {
  return (
    <>
      {/*wrapper*/}
      <div
        className={'setting-wrapper h-full w-full content-center justify-center gap-28 overflow-hidden bg-slate-800/75'}
      >
        {/*inner*/}
        <div
          className={
            'setting-window relative m-auto ms-auto flex h-5/6 w-11/12 overflow-hidden rounded-2xl bg-gray-100 px-3.5 py-6 antialiased shadow-2xl'
          }
        >
          {/*close button*/}
          <motion.div
            className={
              'absolute right-4 top-4 h-10 w-10 rounded-3xl bg-red-300 text-red-50 shadow-2xl hover:bg-red-500'
            }
          >
            <XMarkIcon />
          </motion.div>
          {/*side bar*/}
          <aside className={'h-full w-48'}>
            <div className={'m-auto mb-4 w-11/12 rounded-lg bg-gray-200 px-1.5 py-4 text-center tracking-wide'}>
              <ul>
                <li className={'line-clamp-2 overflow-hidden py-1.5 font-medium hover:rounded-lg hover:bg-gray-300'}>
                  Manage workspaces
                </li>
              </ul>
            </div>
          </aside>
          {/*folder selection*/}
          <div className={'h-full grow overflow-x-auto pl-4'}>
            {/*current folder*/}
            <div className={'mx-6 my-4 rounded-lg bg-gradient-to-l from-gray-100 to-gray-200 px-5 py-5'}>
              <section className={'flex text-lg'}>
                <FolderOpenIcon className={'size-6 self-center'} />
                <span className={'grow pl-2.5'}>current folder</span>
              </section>
              <div className={'flex justify-center pt-5'}>
                <button
                  className={
                    'rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 px-5 py-2.5 text-center font-medium text-gray-50 shadow-md'
                  }
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
              <ul>
                <li
                  className={
                    'my-2.5 mb-2 flex from-gray-200 to-gray-100 py-3.5 pl-2.5 hover:rounded-lg hover:bg-gradient-to-r'
                  }
                >
                  <FolderIcon className={'size-4 self-center'} />
                  <span className={'pl-2'}>folder</span>
                </li>
                <li
                  className={
                    'my-2.5 mb-2 flex from-gray-200 to-gray-100 py-3.5 pl-2.5 hover:rounded-lg hover:bg-gradient-to-r'
                  }
                >
                  <FolderIcon className={'size-4 self-center'} />
                  <span className={'pl-2'}>folder</span>
                </li>
                <li
                  className={
                    'my-2.5 mb-2 flex from-gray-200 to-gray-100 py-3.5 pl-2.5 hover:rounded-lg hover:bg-gradient-to-r'
                  }
                >
                  <FolderIcon className={'size-4 self-center'} />
                  <span className={'pl-2'}>folder</span>
                </li>
                <li
                  className={
                    'my-2.5 mb-2 flex from-gray-200 to-gray-100 py-3.5 pl-2.5 hover:rounded-lg hover:bg-gradient-to-r'
                  }
                >
                  <FolderIcon className={'size-4 self-center'} />
                  <span className={'pl-2'}>folder</span>
                </li>
                <li
                  className={
                    'my-2.5 mb-2 flex from-gray-200 to-gray-100 py-3.5 pl-2.5 hover:rounded-lg hover:bg-gradient-to-r'
                  }
                >
                  <FolderIcon className={'size-4 self-center'} />
                  <span className={'pl-2'}>folder</span>
                </li>
                <li
                  className={
                    'my-2.5 mb-2 flex from-gray-200 to-gray-100 py-3.5 pl-2.5 hover:rounded-lg hover:bg-gradient-to-r'
                  }
                >
                  <FolderIcon className={'size-4 self-center'} />
                  <span className={'pl-2'}>folder</span>
                </li>
              </ul>
            </div>
          </div>
          {/* ... */}
        </div>
      </div>
    </>
  );
}
