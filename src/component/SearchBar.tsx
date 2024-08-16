import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLayoutEffect } from '@tanstack/react-router';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { TTagsInMemory } from 'electron-src/Types/Tags.ts';
import path from 'path-browserify';
import { TMDFile } from 'electron-src/Types/Files.ts';
import { ESearchTypes, TSearchTarget } from 'electron-src/Types/Search.ts';
import FlexSearch from 'flexsearch';

const { IPCRenderSide } = window;

export type TSearchOptions = {
  ShowResult?: boolean;
  ShowActions?: boolean;
  DisplayMode?: 'dropdown' | 'block';
  LockSearchType?: ESearchTypes | null;
};

export type TSearchCallbacks = {
  MdList?: (Result: TMDFile[]) => void;
  TagList?: (Result: TTagsInMemory[]) => void;
  Content?: (Result: number[]) => void;
};

export default function SearchBar({
  MDList,
  TagsList,
  FileContent,
  SearchCallbacks,
  AdditionalClasses,
  SearchOptions,
}: {
  MDList?: TMDFile[] | null;
  TagsList?: TTagsInMemory[] | null;
  FileContent?: string;
  SearchCallbacks?: TSearchCallbacks;
  AdditionalClasses?: string;
  SearchOptions?: Partial<TSearchOptions>;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const InputRef = useRef(null);
  const ResultListRef = useRef<HTMLDivElement | null>(null);
  const ContentActionsRef = useRef<HTMLDivElement | null>(null);

  // Merge "default options" and the parent passed options
  const Options: TSearchOptions = {
    ShowResult: true,
    ShowActions: true,
    DisplayMode: 'dropdown',
    LockSearchType: null,
    ...SearchOptions,
  };

  const [searchString, setSearchString] = useState('');
  const [placeHolderText, setPlaceHolderText] = useState('Search');
  const [searchType, setSearchType] = useState<ESearchTypes | null>(
    Options.LockSearchType ? Options.LockSearchType : ESearchTypes.File,
  );

  // Use flex search to properly filter list datas, tokenize is set to full so that filenames can be fuzzy searched
  const FilterListData = useCallback(
    (targetList: TMDFile[] | TTagsInMemory[] | null | undefined, searchTerm: string) => {
      if (!targetList || !Array.isArray(targetList)) return [];
      if (searchTerm.trim() === '') return targetList;

      const ListFileterer = new FlexSearch.Document({
        tokenize: 'full',
        cache: 100,
        document: {
          id: '',
          index: ['name', 'tagFileName'], // fields to index
          store: Object.keys(targetList[0]), // fields to store
        },
      });

      for (let i = 0; i < targetList.length; i++) {
        ListFileterer.add(i, targetList[i]);
      }

      const SearchResult = ListFileterer.search(searchTerm);
      let FilteredArray = [];
      if (Array.isArray(SearchResult) && SearchResult[0] && Array.isArray(SearchResult[0].result)) {
        for (let indexNum of SearchResult[0].result) {
          FilteredArray.push(targetList[indexNum as number]);
        }
      }

      return FilteredArray;
    },
    [],
  );

  const DataSourceMap = useMemo(
    () =>
      new Map<ESearchTypes, any[]>([
        // [ESearchTypes.File, MDList?.filter(item => item.name.startsWith(searchString)) || []],
        [ESearchTypes.File, FilterListData(MDList, searchString)],
        // [ESearchTypes.Tag, TagsList?.filter(item => item.tagFileName.startsWith(searchString)) || []],
        [ESearchTypes.Tag, FilterListData(TagsList, searchString)],
      ]),
    [MDList, TagsList, searchString, FilterListData],
  );
  // shortcuts
  const filteredMDList = DataSourceMap.get(ESearchTypes.File) as TMDFile[];
  const filteredTagList = DataSourceMap.get(ESearchTypes.Tag) as TTagsInMemory[];

  // Stores the pure text content from each lines of the editor DOM
  // each index represent a top-level child element(like p or ul) from the original content
  const contentNodeExtraction = useRef<string[]>([]);

  const filteredContentLines = useMemo(() => {
    if (!contentNodeExtraction.current || !contentNodeExtraction.current.length) return [];
    if (!searchString || searchString.trim() === '') return [...Object.keys(contentNodeExtraction)]; // no search string, return all the index, indicating that all children are valid result.

    const TextContentIndexer = new FlexSearch.Index('performance');
    for (let index = 0; index < contentNodeExtraction.current.length; index++) {
      TextContentIndexer.add(index, contentNodeExtraction.current[index]);
    }

    const searchResult = TextContentIndexer.search(searchString);
    console.log(searchResult);
    return searchResult as number[];
  }, [searchString]);

  // when FileContent prop changes, convert it to a usable format async
  useEffect(() => {
    // first reset the ref
    contentNodeExtraction.current = [];
    // convert html string to Dom elements
    if (!FileContent || FileContent.trim() === '') return;
    const template = document.createElement('template');
    template.innerHTML = FileContent;
    // console.warn('New content', template.content);
    if (!template.content || !template.content.children.length) return;

    const LinesOfContent = Array.from(template.content.children);

    // Extract all text nodes, but keep them in an array identical to the original
    LinesOfContent.forEach(line => {
      const walker = document.createTreeWalker(
        line,
        NodeFilter.SHOW_TEXT,
        null, // No filter function
      );

      let currentNode;
      let currentTextNodesResult = '';
      while ((currentNode = walker.nextNode())) {
        if (currentNode.textContent && currentNode.textContent.trim() !== '')
          currentTextNodesResult += currentNode.textContent + ' ';
      }
      contentNodeExtraction.current.push(currentTextNodesResult);
    });
  }, [FileContent]);

  // the high lighted search result for list items, this is used in arrow key navigation as well as mouse hover selection
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  // bind to main process push BEGIN_NEW_SEARCH, happens when there is search initiated from outside(like file adding menu)
  useEffect(() => {
    const UnbindEvent = IPCRenderSide.on(IPCActions.DATA.PUSH.BEGIN_NEW_SEARCH, (_, searchPayload) => {
      if (!searchPayload) return console.warn('Search bar: Received empty payload');
      setPlaceHolderText((searchPayload as TSearchTarget).placeHolder || '');
      setIsSearching(true);
      if (!Options.LockSearchType) setSearchType((searchPayload as TSearchTarget).searchType || null);
      if (InputRef.current) (InputRef.current as HTMLInputElement).focus();
    });

    return () => {
      UnbindEvent();
    };
  }, []);

  // Send the filtered list data to main process
  useEffect(() => {
    if (!SearchCallbacks) return;

    if (typeof SearchCallbacks.MdList === 'function') {
      SearchCallbacks.MdList(filteredMDList);
    }

    if (typeof SearchCallbacks.TagList === 'function') {
      SearchCallbacks.TagList(filteredTagList);
    }

    if (typeof SearchCallbacks.Content === 'function') {
      // SearchCallbacks.Content(filteredContentLines);
    }
  }, [searchString, TagsList, MDList, FileContent]);

  // close the search result when clicking other parts of the page.
  function CloseSearch(ev: HTMLElementEventMap['click']) {
    if (
      ev.target === InputRef.current ||
      (ResultListRef.current && ResultListRef.current.contains(ev.target as Node)) ||
      (ContentActionsRef.current && ContentActionsRef.current.contains(ev.target as Node))
    )
      return;
    setIsSearching(false);
  }

  // bind to click event to close the search result
  useLayoutEffect(() => {
    document.addEventListener('click', CloseSearch);

    return () => {
      document.removeEventListener('click', CloseSearch);
    };
  }, []);

  // Reset the placeholder text after closing
  useEffect(() => {
    if (isSearching) return;
    setPlaceHolderText('Search');
  }, [isSearching]);

  // reset the index when data or state changes
  useEffect(() => {
    setActiveResultIndex(0);
  }, [MDList, TagsList, isSearching]);

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
    // setSearchString('');
    setIsSearching(false);
  }

  function ActiveResultSelection(ctrlPressed: boolean = false) {
    if (!searchType) return;
    const tagSource = DataSourceMap.get(searchType);
    if (!tagSource) return;
    const tagSourceElement = tagSource[activeResultIndex];
    // single click/enter without holding ctrl, insert to current editor
    if (ctrlPressed) IPCRenderSide.send(IPCActions.EDITOR_MD.INSERT_FILE_LINK, tagSourceElement);
    // console.log(tagSourceElement, 'ctrl key:', ctrlPressed);
    setIsSearching(false);
  }

  function ArrowKeyNavigation(Arrowkey: 'up' | 'down') {
    if (!searchType) return;
    const activeDataSet = DataSourceMap.get(searchType);
    if (!activeDataSet) return;
    if (Arrowkey === 'up')
      setActiveResultIndex(prevIndex => (prevIndex > 0 ? prevIndex - 1 : activeDataSet.length - 1));
    if (Arrowkey === 'down')
      setActiveResultIndex(prevIndex => (prevIndex < activeDataSet.length - 1 ? prevIndex + 1 : 0));
  }

  return (
    <nav
      className={`light:border-b h-18 relative z-50 w-full bg-gray-50 px-4 py-2.5 dark:bg-slate-700 dark:text-blue-50 ${AdditionalClasses}`}
      onClick={_ => {
        if (InputRef.current) (InputRef.current as HTMLInputElement).focus();
      }}
    >
      <section className={'flex'}>
        <MagnifyingGlassIcon className={'order-1 size-6 self-center'} />
        <input
          id={'main-search-bar'}
          ref={InputRef}
          type={'text'}
          placeholder={placeHolderText}
          value={searchString}
          onKeyUp={ev => {
            if (ev.key === 'ArrowUp') ArrowKeyNavigation('up');
            if (ev.key === 'ArrowDown') ArrowKeyNavigation('down');
            if (ev.key === 'Escape') setIsSearching(false);
            if (ev.key === 'Enter') {
              if (!isSearching) return setIsSearching(true);
              ActiveResultSelection(ev.ctrlKey);
            }
          }}
          onChange={ev => {
            let inputValue = ev.target.value;
            const inputParts = inputValue.split(':');
            const prefix = inputParts[0];
            const ComparingPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase(); //turn the first letter to upper case
            const searchType = ComparingPrefix in ESearchTypes ? (ComparingPrefix as ESearchTypes) : null;
            if (searchType && inputParts.length > 1) {
              inputValue = inputParts[1];
              if (!Options.LockSearchType) setSearchType(searchType);
            }
            setSearchString(inputValue);
            if (!isSearching && inputValue !== '') setIsSearching(true);
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
      {/*  the search result list for files and tags*/}
      {isSearching && searchType !== ESearchTypes.Content && (
        <div
          className={` ${Options.DisplayMode === 'dropdown' ? 'absolute w-11/12' : 'block'} left-2 top-14 h-fit max-h-96 cursor-default select-none overflow-y-auto overflow-x-hidden bg-inherit px-6 py-4 ${Options.DisplayMode === 'dropdown' ? 'rounded-b-lg shadow-xl' : ''} dark:text-blue-50`}
          ref={ResultListRef}
        >
          {/*additional actions*/}
          {Options.ShowActions && (
            <ul className={'mt-2 cursor-pointer pb-2'}>
              <li
                className={`rounded px-4 py-2 hover:bg-blue-100 dark:hover:bg-blue-400`}
                onClick={() => CreateNewFile()}
              >
                <span>Create New {searchType || ''} </span>
                <span className={'font-semibold text-blue-500'}>{searchString || ''}</span>
              </li>
            </ul>
          )}
          {/*search result - files*/}
          {searchType === ESearchTypes.File && Options.ShowResult && filteredMDList && filteredMDList.length > 0 && (
            <>
              <hr className={'mb-2'} />
              <ul className={'mb-4'}>
                {filteredMDList.map((item, index) => (
                  <li
                    key={item.path}
                    onMouseEnter={() => setActiveResultIndex(index)}
                    onMouseDown={() => setActiveResultIndex(index)}
                    onMouseUp={ev => ActiveResultSelection(ev.ctrlKey)}
                    className={`flex rounded px-4 py-2 ${activeResultIndex === index ? 'bg-gray-200 dark:bg-slate-500' : ''}`}
                  >
                    <span className={'grow'}>{path.parse(item.name).name}</span>
                    {/*<span className={'px-6'}>{item.path}</span>*/}
                    <span className={`px-6 sm:hidden ${activeResultIndex !== index ? 'hidden' : 'md:block'}`}>
                      hold{' '}
                      <kbd className="rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-xs font-semibold text-gray-800 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-100">
                        Ctrl
                      </kbd>{' '}
                      to Link
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {/*search result - tags*/}
          {searchType === ESearchTypes.Tag && Options.ShowResult && filteredTagList && filteredTagList.length > 0 && (
            <>
              <hr className={'mb-2'} />
              <ul className={'mb-4'}>
                {filteredTagList.map((item, index) => (
                  <li
                    key={item.tagPath}
                    onMouseEnter={() => setActiveResultIndex(index)}
                    onMouseDown={() => setActiveResultIndex(index)}
                    onMouseUp={ev => ActiveResultSelection(ev.ctrlKey)}
                    className={`flex rounded px-4 py-2 ${activeResultIndex === index ? 'bg-gray-200 dark:bg-slate-500' : ''}`}
                  >
                    <span className={'pr-3 font-semibold text-gray-600 dark:text-slate-600'}>Tag:</span>
                    <span className={'grow'}>{path.parse(item.tagFileName).name.split('.')[0]}</span>
                    <span className={`px-6 sm:hidden ${activeResultIndex !== index ? 'hidden' : 'md:block'}`}>
                      hold{' '}
                      <kbd className="rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-xs font-semibold text-gray-800 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-100">
                        Ctrl
                      </kbd>{' '}
                      to Link
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {isSearching && searchType === ESearchTypes.Content && (
        <div
          ref={ContentActionsRef}
          className={`flex h-12 cursor-default select-none flex-row overflow-ellipsis rounded-xl bg-inherit px-6 py-4 dark:text-blue-50`}
        >
          <div>Result:</div>
        </div>
      )}
    </nav>
  );
}
