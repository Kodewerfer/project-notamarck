import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import { useLayoutEffect } from '@tanstack/react-router';
import { TMDFile } from 'electron-src/IPC/IPC-Handlers.ts';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { ESearchTypes, TSearchTarget } from 'electron-src/Types/GlobalStorage.ts';
import { TTagsInMemory } from 'electron-src/Types/Tags.ts';
import path from 'path-browserify';

const { IPCRenderSide } = window;
export default function SearchBar({
  MDList,
  TagsList,
}: {
  MDList?: TMDFile[] | null;
  TagsList?: TTagsInMemory[] | null;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const InputRef = useRef(null);
  const WrapperElementRef = useRef<HTMLDivElement | null>(null);

  const [searchString, setSearchString] = useState('');
  const [placeHolderText, setPlaceHolderText] = useState('Search');
  const [searchType, setSearchType] = useState<ESearchTypes | null>(ESearchTypes.File);

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
      setPlaceHolderText((searchPayload as TSearchTarget).placeHolder || '');
      setIsSearching(true);
      setSearchType((searchPayload as TSearchTarget).searchType || null);
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
    // todo:prompt the user about invalid file names
    if (!searchString || searchString.trim() === '' || searchString.indexOf('.') !== -1) return;
    let currentWorkspace = await IPCRenderSide.invoke(IPCActions.APP.GET_WORK_SPACE);
    try {
      // file creation
      if (searchType === ESearchTypes.File)
        await IPCRenderSide.invoke(IPCActions.FILES.CREATE_NEW_FILE, `${currentWorkspace}/${searchString}.md`);
      // tags
      if (searchType === ESearchTypes.Tag) await IPCRenderSide.invoke(IPCActions.FILES.CREATE_NEW_TAG, searchString);
    } catch (e) {
      await IPCRenderSide.invoke(IPCActions.DIALOG.SHOW_MESSAGE_DIALOG, {
        type: 'error',
        message: `Error creating new file`,
        detail: `${e}`,
      });
    }
    setSearchString('');
    // setIsSearching(false);
  }

  const filteredMDList = MDList?.filter(item => item.name.startsWith(searchString));
  const filteredTagList = TagsList?.filter(item => item.tagFileName.startsWith(searchString));

  return (
    <nav
      className={
        'light:border-b h-18 relative z-40 w-full border-gray-200 px-4 py-2.5 dark:bg-slate-700 dark:text-blue-50'
      }
    >
      <section className={'flex'}>
        <MagnifyingGlassIcon className={'order-1 size-6 self-center'} />
        <input
          id={'main-search-bar'}
          ref={InputRef}
          type={'text'}
          placeholder={placeHolderText}
          value={searchString}
          onChange={ev => {
            let inputValue = ev.target.value;
            const inputParts = inputValue.split(':');
            const prefix = inputParts[0];
            const ComparingPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase(); //turn the first letter to upper case
            const searchType = ComparingPrefix in ESearchTypes ? (ComparingPrefix as ESearchTypes) : null;
            if (searchType && inputParts.length > 1) {
              setSearchType(searchType);
              inputValue = inputParts[1];
            }
            setSearchString(inputValue);
          }}
          onClick={_ => setIsSearching(!isSearching)}
          className={
            'peer order-3 grow border-0 border-b-2 border-transparent bg-transparent py-1.5 pl-2 text-gray-900' +
            ' placeholder:text-gray-400 focus:border-gray-300 focus:outline-0 focus:ring-0 sm:text-sm sm:leading-6 dark:text-blue-50'
          }
        />
        <label
          htmlFor={'main-search-bar'}
          className={
            'order-2 self-center px-2 text-sm text-gray-500 duration-150' +
            ' peer-placeholder-shown:scale-80 peer-placeholder-shown:text-gray-400' +
            ' peer-focus:scale-120 peer-focus:text-lg peer-focus:font-semibold peer-focus:text-blue-500' +
            ' rtl:peer-focus:translate-x-1/4 dark:text-gray-400'
          }
        >
          {searchType ? searchType : ''}:
        </label>
      </section>
      {/*  the search result list*/}
      {isSearching && (
        <div
          className={`absolute left-2 top-16 h-fit max-h-96 w-11/12 cursor-default select-none overflow-y-auto overflow-x-hidden rounded-lg bg-gray-50 px-6 py-4 shadow-xl dark:bg-slate-700 dark:text-blue-50`}
          ref={WrapperElementRef}
        >
          {/*search result - files*/}
          {searchType === ESearchTypes.File && filteredMDList && filteredMDList.length > 0 && (
            <>
              <ul>
                {filteredMDList.map(item => (
                  <li key={item.path} className={'flex py-2 last:pb-8'}>
                    <span className={'grow'}>{item.name}</span>
                    <span className={'px-6'}>{item.path}</span>
                  </li>
                ))}
              </ul>
              <hr />
            </>
          )}
          {/*search result - tags*/}
          {searchType === ESearchTypes.Tag && filteredTagList && filteredTagList.length > 0 && (
            <>
              <ul>
                {filteredTagList.map(item => (
                  <li key={item.tagPath} className={'flex py-2 last:pb-8'}>
                    <span className={'pr-3 font-semibold text-gray-600 dark:text-slate-600'}>Tag:</span>
                    <span className={'grow'}>{path.parse(item.tagFileName).name.split('.')[0]}</span>
                  </li>
                ))}
              </ul>
              <hr />
            </>
          )}
          {/*additional actions*/}
          <ul className={'mt-2 cursor-pointer'}>
            <li className={'py-2 last:pb-6'} onClick={() => CreateNewFile()}>
              <span>Create New {searchType || ''} </span>
              <span>{searchString || ''}</span>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
