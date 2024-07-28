import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import { useLayoutEffect } from '@tanstack/react-router';
import { TMDFile } from 'electron-src/IPC/IPC-Handlers.ts';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { TSearchTarget, TSearchTargetTypes } from 'electron-src/Storage/Globals.ts';

const { IPCRenderSide } = window;
export default function SearchBar({ MDList }: { MDList: TMDFile[] | null }) {
  const [isSearching, setIsSearching] = useState(false);
  const InputRef = useRef(null);
  const WrapperElementRef = useRef<HTMLDivElement | null>(null);

  const [searchString, setSearchString] = useState('');
  const [placeHolderText, setPlaceHolderText] = useState('Search');
  const [searchType, setSearchType] = useState<TSearchTargetTypes>('File'); //todo

  // TODO: use the placeholder prop to dynamically prompt user

  // close the search result when clicking other parts of the page.
  function CloseSearch(ev: HTMLElementEventMap['click']) {
    if (
      ev.target === InputRef.current ||
      (WrapperElementRef.current && WrapperElementRef.current.contains(ev.target as Node))
    )
      return;
    setIsSearching(false);
  }

  useLayoutEffect(() => {
    document.addEventListener('click', CloseSearch);

    return () => {
      document.removeEventListener('click', CloseSearch);
    };
  }, []);

  // bind to main process push
  useEffect(() => {
    const UnbindEvent = IPCRenderSide.on(IPCActions.DATA.PUSH.BEGIN_NEW_SEARCH, (_, searchPayload) => {
      if (!searchPayload) return console.warn('Search bar: Received empty payload');

      console.log(searchPayload);

      console.log((searchPayload as TSearchTarget).placeHolder);
      setPlaceHolderText((searchPayload as TSearchTarget).placeHolder || '');
      setIsSearching(true);
      setSearchType((searchPayload as TSearchTarget).searchType || 'File');
      if (InputRef.current) (InputRef.current as HTMLInputElement).focus();
    });

    return () => {
      UnbindEvent();
    };
  }, []);

  // Reset the placeholder text after closing
  useEffect(() => {
    if (isSearching) return;
    setPlaceHolderText('Search');
  }, [isSearching]);

  // create new file
  async function CreateNewFile() {
    if (!searchString || searchString.trim() === '') return;
    let currentWorkspace = await IPCRenderSide.invoke(IPCActions.APP.GET_WORK_SPACE);
    try {
      await IPCRenderSide.invoke(IPCActions.FILES.CREATE_NEW_FILE, `${currentWorkspace}/${searchString}.md`);
    } catch (e) {
      await IPCRenderSide.invoke(IPCActions.DIALOG.SHOW_MESSAGE_DIALOG, {
        type: 'error',
        message: `Error creating new file`,
        detail: `${e}`,
      });
    }
    setSearchString('');
    setIsSearching(false);
  }

  const filteredMDList = MDList?.filter(item => item.name.startsWith(searchString));

  return (
    <nav
      className={
        'light:border-b h-18 relative z-40 w-full border-gray-200 px-4 py-2.5 dark:bg-slate-700 dark:text-blue-50'
      }
    >
      <section className={'flex'}>
        <MagnifyingGlassIcon className={'size-6 self-center'} />
        <input
          ref={InputRef}
          type={'text'}
          placeholder={placeHolderText}
          value={searchString}
          onChange={ev => setSearchString(ev.target.value)}
          onClick={_ => setIsSearching(!isSearching)}
          className={
            'grow border-0 bg-transparent py-1.5 pl-2 text-gray-900 placeholder:text-gray-400 focus:outline-0 focus:ring-0 sm:text-sm sm:leading-6 dark:text-blue-50'
          }
        />
      </section>
      {/*  the search result list*/}
      {isSearching && (
        <div
          className={`absolute left-2 top-16 h-fit max-h-96 w-11/12 cursor-default select-none overflow-y-auto overflow-x-hidden rounded-lg bg-gray-50 px-6 py-4 shadow-xl dark:bg-slate-700 dark:text-blue-50`}
          ref={WrapperElementRef}
        >
          {/*search result*/}
          {filteredMDList && filteredMDList.length > 0 && (
            <>
              <ul>
                {filteredMDList.map(item => (
                  <li key={item.path} className={'flex py-2 last:pb-8'}>
                    <span className={'grow'}>{item.name}</span>
                    <span className={'px-6'}>{item.path}</span>
                    <span>{item.size}</span>
                  </li>
                ))}
              </ul>
              <hr />
            </>
          )}
          {/*additional actions*/}
          <ul className={'mt-2 cursor-pointer'}>
            <li className={'py-2 last:pb-6'} onClick={() => CreateNewFile()}>
              <span>Create New {searchType} </span>
              <span>{searchString || ''}</span>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
