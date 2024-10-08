import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/16/solid';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import MarkdownEditor, { TEditorComponentRef } from 'component/base/MarkdownEditor.tsx';
import { TFileInMemory } from 'electron-src/Types/GlobalData.ts';
import { TChangedFilesPayload } from 'electron-src/Types/IPC.ts';
import { useNavigate } from '@tanstack/react-router';
import path from 'path-browserify';
import _ from 'lodash';

import './css/TabFrame.css';
import './css/EditorStyles.css';

// Identifying info a tab holds, in addition to fs related props, add selection cache
export type TTabItems = TFileInMemory & {
  selectionCache?: Object | null;
};

const { IPCRenderSide } = window;
export default function TabFrame() {
  const navigate = useNavigate();

  const [AllTabs, setAllTabs] = useState<TTabItems[]>([]);
  // NOTE: active tab/SelectedTab is not fetched from main, when the frame init and tabs has data, SelectedTab will be the first in order and send to main
  const [SelectedTab, setSelectedTab] = useState<TTabItems | null | undefined>(null); //acts like a cache for file info, do not compare ref directly

  const lastSearchResultElements = useRef<HTMLElement[] | null>(null);

  const MDEditorRef = useRef<TEditorComponentRef | null>(null);
  const TabBarRef = useRef<HTMLElement | null>(null);

  // Passed down from main frame context
  // const mainFrameScrollable = useContext(ScrollableElementContext);
  const ScrollableArea = useRef<HTMLElement | null>(null);

  // Handles the content search result, debounced to avoid excessive function calls
  const contentSearchHandler = useCallback(
    _.debounce((payload: number[]) => {
      if (!Array.isArray(payload)) return;

      const editorDOM = MDEditorRef.current?.GetDOM()?.editor;
      if (!editorDOM || !editorDOM.children) return;

      let resultLines: HTMLElement[] = [];
      payload.forEach(lineNumber => {
        resultLines.push(editorDOM.children[lineNumber] as HTMLElement);
      });

      // TODO: no need for this, remove later
      // remove the result effect from last time
      lastSearchResultElements.current?.forEach(lastResult => {
        lastResult?.classList.remove('search-result');
      });

      lastSearchResultElements.current = [...resultLines];

      // add result effect
      resultLines.forEach(resultElement => {
        resultElement?.classList.add('search-result');
      });
    }, 300),
    [],
  );

  // scroll the editor to a top-level element(a line), debounced to avoid excessive function calls
  const handleJumpToLineNum = _.throttle((lineNum: number) => {
    const editorDOM = MDEditorRef.current?.GetDOM()?.editor;
    if (!editorDOM || !editorDOM.children || !editorDOM.children[lineNum]) return;

    setTimeout(() => {
      const { top } = editorDOM.children[lineNum].getBoundingClientRect();

      if (ScrollableArea?.current) {
        const divTop = ScrollableArea.current.getBoundingClientRect().top;
        const tabBarHeight = (TabBarRef?.current && TabBarRef.current.scrollHeight) || 0;
        ScrollableArea.current.scrollTop = top - divTop - tabBarHeight * 3;
      }
    }, 0);
  }, 500);

  // init component
  useEffect(() => {
    (async () => {
      const AllOpenedFiles: TTabItems[] = await IPCRenderSide.invoke(IPCActions.DATA.GET_ALL_OPENED_FILES);
      if (Array.isArray(AllOpenedFiles) && AllTabs.length === 0) setAllTabs(AllOpenedFiles);
    })();
  }, []);

  // init the selected tab, set to the first tab if non-exist
  useEffect(() => {
    (async () => {
      if (SelectedTab || !AllTabs || !AllTabs.length) return;
      const cachedActiveFile: TFileInMemory | null = await IPCRenderSide.invoke(IPCActions.DATA.GET_ACTIVE_FILE);

      const setToFirstTab = () => {
        setSelectedTab(AllTabs[0]);
        IPCRenderSide.send(IPCActions.DATA.CHANGE_ACTIVE_FILE, AllTabs[0]);
      };

      if (!cachedActiveFile) {
        setToFirstTab();
        return;
      }

      const foundTabIndex = AllTabs.findIndex(loadedTab => loadedTab.fullPath === cachedActiveFile.fullPath);
      if (foundTabIndex >= 0) setSelectedTab(AllTabs[foundTabIndex]);
      else setToFirstTab();
    })();
  }, [AllTabs]);

  // Bind to main process' push events
  useEffect(() => {
    // when new search result arrives, new result is received in fileframe, then pushed through main
    const unbindNewJumpToLine = IPCRenderSide.on(
      IPCActions.EDITOR_MD.PUSH.NEW_JUMP_TO_LINE_TARGET,
      (_, payload: number) => {
        handleJumpToLineNum(payload);
      },
    );

    const unbindSearchResultChanged = IPCRenderSide.on(
      IPCActions.EDITOR_MD.PUSH.NEW_CONTENT_SEARCH_RESULT,
      (_, payload: number[]) => {
        if (!payload || !Array.isArray(payload)) return;
        contentSearchHandler(payload);
      },
    );

    // whenever a new file is opened/closed on main
    const unbindOpenedFileChange = IPCRenderSide.on(
      IPCActions.DATA.PUSH.OPENED_FILES_CHANGED,
      (_, payload: TTabItems[]) => {
        if (!payload || !Array.isArray(payload)) return;

        const TabsMap = new Map(AllTabs.map(tabItem => [tabItem.fullPath, tabItem]));
        const Added = payload.filter(fileItem => !TabsMap.has(fileItem.fullPath));

        const payloadPathMap = new Map(payload.map(fileItem => [fileItem.fullPath, fileItem]));
        const FilteredTabs = AllTabs.filter(tabItem => payloadPathMap.has(tabItem.fullPath));

        setAllTabs(FilteredTabs.concat(Added));
      },
    );

    // whenever a file's content has been changed on main(could be pushed by this component)
    const unbindFileContentChange = IPCRenderSide.on(
      IPCActions.DATA.PUSH.OPENED_FILE_CONTENT_CHANGED,
      (_, payload: TChangedFilesPayload[]) => {
        const TabsMap = new Map(AllTabs.map(tabItem => [tabItem.fullPath, tabItem]));
        payload.forEach(item => {
          if (TabsMap.get(item.TargetFilePath)) {
            TabsMap.set(item.TargetFilePath, item.NewFile);
          }
        });
        const TabsArrayFromArray = Array.from(TabsMap, ([_key, value]) => value);

        setAllTabs(TabsArrayFromArray);
      },
    );

    // whenever a file is set to be activated on main, could be the result of opening a file, new or not
    const unbindFileActivationChange = IPCRenderSide.on(
      IPCActions.DATA.PUSH.ACTIVE_FILE_CHANGED,
      (_, payload: TFileInMemory | null) => {
        if (!payload) return setSelectedTab(null);
        // Since SelectedTab act more like a cache(not directly used in comparing references), add the value in directly
        setSelectedTab(payload);
      },
    );

    // after getting request of text insert to the current tab
    const unbindEditorTextInsert = IPCRenderSide.on(
      IPCActions.EDITOR_MD.PUSH.TEXT_INSERT_REQUEST,
      (_, payload: string) => {
        if (payload.trim() === '') return;
        if (!SelectedTab) {
          IPCRenderSide.send(IPCActions.NOTIFICATION.SHOW_NOTIFICATION, 'Cannot Insert Text', 'No editing file');
          return;
        }
        // prevent self referencing
        if (payload.includes(SelectedTab.filename)) {
          IPCRenderSide.send(
            IPCActions.NOTIFICATION.SHOW_NOTIFICATION,
            'Cannot Insert File Link',
            "File link can't link to self.",
          );
          return;
        }
        MDEditorRef.current?.InsertText(payload);
      },
    );

    // on receiving saving signal from main
    const unbindSaveSignal = IPCRenderSide.on(IPCActions.SHORT_CUT.SIGNAL.SAVE, async _ => {
      if (!SelectedTab || !MDEditorRef) return;

      const selectedTabContent = await MDEditorRef?.current?.ExtractMD();

      IPCRenderSide.send(IPCActions.FILES.CHANGE_TARGET_FILE_CONTENT, SelectedTab.fullPath, selectedTabContent);
    });

    // on receiving saving signal from main
    const unbindCloseSignal = IPCRenderSide.on(IPCActions.SHORT_CUT.SIGNAL.CLOSE, async _ => {
      if (!SelectedTab || !MDEditorRef) return;
      await onCloseTab(SelectedTab);
    });

    return () => {
      unbindNewJumpToLine();
      unbindOpenedFileChange();
      unbindFileContentChange();
      unbindFileActivationChange();
      unbindEditorTextInsert();
      unbindSearchResultChanged();
      unbindSaveSignal();
      unbindCloseSignal();
    };
  }); // Critical!!: These events have to be bind and unbind each time,(no useEffect dep array ) so that when FileFrame._tabFrame.edit.$filepath is accessed, the references and info are correct

  const onReOrder = (newArray: TTabItems[]) => {
    setAllTabs(newArray);
    IPCRenderSide.send(IPCActions.DATA.SET_OPENED_FILES, newArray);
  };

  const onSelectTab = async (item: TTabItems) => {
    if (item?.fullPath === SelectedTab?.fullPath) return;
    // await SendCurrentTabContentToMain();
    // NOTE:setting the SelectedTab is not exactly required because main process will put into it after the next line.
    setSelectedTab(item);
    IPCRenderSide.send(IPCActions.DATA.CHANGE_ACTIVE_FILE, item);
  };

  const onCloseTab = async (item: TTabItems) => {
    // Notify backend
    if (item.fullPath === SelectedTab?.fullPath) {
      // await SendCurrentTabContentToMain();
      const nextTab = closestItem(AllTabs, item);
      setSelectedTab(nextTab);
      IPCRenderSide.send(IPCActions.DATA.CHANGE_ACTIVE_FILE, nextTab);
    }

    setAllTabs(removeItem(AllTabs, item));
    // save the file's content then close it in memory
    IPCRenderSide.invoke(IPCActions.DATA.SAVE_TARGET_OPENED_FILE, item.fullPath).catch((e: Error) => {
      IPCRenderSide.invoke(IPCActions.DIALOG.SHOW_MESSAGE_DIALOG, {
        type: 'error',
        message: `Error saving file`,
        detail: `${e}`,
      });
    });
    IPCRenderSide.invoke(IPCActions.DATA.CLOSE_TARGET_OPENED_FILES, item);
  };

  // When the editor mounts load the selection status from the cache.
  const onSubEditorMounted = async () => {
    if (!SelectedTab || !AllTabs) return;
    const cachedSelection = await IPCRenderSide.invoke(
      IPCActions.DATA.GET_SELECTION_STATUS_CACHE,
      SelectedTab.fullPath,
    );

    MDEditorRef.current?.SetSelection(cachedSelection);

    // force the code to run at the end of the even loop
    // scroll it to the element
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection) return;
      const range = selection.getRangeAt(0).cloneRange();
      const { top } = range.getBoundingClientRect();

      if (ScrollableArea?.current) {
        const divTop = ScrollableArea.current.getBoundingClientRect().top;
        const tabBarHeight = (TabBarRef?.current && TabBarRef.current.scrollHeight) || 0;
        ScrollableArea.current.scrollTop = top - divTop - tabBarHeight * 2;
      }
    }, 0);
  };

  // cache info such as selection status to main process using info passed from editor before unmounting
  const onSubEditorUnmounted = async (extractedData: any) => {
    if (!extractedData.fullPath || extractedData.fullPath === '') return;
    // save selection status
    if (extractedData.selectionStatus)
      IPCRenderSide.invoke(
        IPCActions.DATA.UPDATE_SELECTION_STATUS_CACHE,
        extractedData.fullPath,
        extractedData.selectionStatus,
      );

    // save file content
    const extractedMdData = await extractedData?.mdData;
    if (!extractedMdData) return;

    // still in opened files
    if (await IPCRenderSide.invoke(IPCActions.DATA.CHECK_IN_OPENED_FILE, extractedData.fullPath)) {
      IPCRenderSide.send(IPCActions.DATA.UPDATE_OPENED_FILE_CONTENT, extractedData.fullPath, extractedMdData);
      return;
    }
    // dealing with the situation when closing down the active file,
    // closing action happens first before the newest content can be extracted
    // file is already closed, save the latest content to file again.

    IPCRenderSide.send(IPCActions.FILES.CHANGE_TARGET_FILE_CONTENT, extractedData.fullPath, extractedMdData); //generic fs API
  };

  return (
    <div className={'TabFrame-wrapper flex h-full w-full flex-col dark:bg-slate-600 dark:text-blue-50'}>
      {/*the tab row*/}
      <nav
        ref={TabBarRef}
        onWheel={ev => {
          //convert vertical scroll to horizontal
          if (!ev.deltaY || !TabBarRef.current) return;
          (TabBarRef.current as HTMLElement).scrollLeft = ev.deltaY + ev.deltaX;
        }}
        className={`tab-bar sticky top-0 z-20 flex h-10 w-full overflow-hidden overflow-x-auto scroll-smooth bg-slate-400 text-slate-800 ${AllTabs.length === 0 && 'hidden'}`}
      >
        <Reorder.Group as="ul" axis="x" onReorder={onReOrder} className="flex flex-nowrap text-nowrap" values={AllTabs}>
          <AnimatePresence initial={false}>
            {AllTabs.map((item: TTabItems) => (
              <Tab
                key={item.fullPath}
                item={item}
                isSelected={SelectedTab?.fullPath === item.fullPath}
                onClick={async () => await onSelectTab(item)}
                onRemove={async () => await onCloseTab(item)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </nav>
      {/* content for the tab */}
      <section
        ref={ScrollableArea}
        className={`z-10 h-full w-full overflow-auto scroll-smooth text-nowrap px-2 pb-5 pl-4 pt-3 focus:scroll-auto ${AllTabs.length === 0 && 'hidden'}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            className={'animate-wrapper'} //marking the usage, no real purpose
            key={SelectedTab ? SelectedTab.filename : 'empty'}
            animate={{ opacity: 1, y: 0, left: 0 }}
            initial={{ opacity: 0, y: 20 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.15 }}
          >
            {SelectedTab && (
              <MarkdownEditor
                key={SelectedTab.fullPath}
                fullPath={SelectedTab.fullPath}
                MDSource={SelectedTab.content || ''}
                onEditorMounted={onSubEditorMounted}
                onEditorUnmounted={onSubEditorUnmounted}
                LinkElementClicked={async (linkType, linkTarget) => {
                  if (linkType.trim() === '' || linkTarget.trim() === '') return;

                  const workspacePath = await IPCRenderSide.invoke(IPCActions.APP.GET_WORK_SPACE);
                  const currentTagPath = await IPCRenderSide.invoke(IPCActions.APP.GET_WORK_SPACE_TAGS_PATH);
                  console.log(linkType, linkTarget);
                  switch (linkType) {
                    case 'file':
                      // target is a tag
                      if (linkTarget.includes('.tag')) {
                        navigate({
                          to: '/TagFrame/$tagPath',
                          params: { tagPath: path.join(currentTagPath, linkTarget) },
                        });
                        break;
                      }
                      // file
                      navigate({
                        to: '/FileFrame/edit/$filepath',
                        params: { filepath: path.join(workspacePath, linkTarget) },
                      });
                      break;
                    case 'http':
                      IPCRenderSide.send(IPCActions.SHELL.OPEN_EXTERNAL_HTTP, linkTarget);
                      break;
                  }
                }}
                EditorCallBacks={{
                  OnInit: SourceHTMLString =>
                    IPCRenderSide.send(IPCActions.DATA.SET_ACTIVE_FILE_CONTENT, SourceHTMLString),
                  OnReload: SourceHTMLString =>
                    IPCRenderSide.send(IPCActions.DATA.SET_ACTIVE_FILE_CONTENT, SourceHTMLString),
                }}
                FileLinks={{
                  removeCallback: linkTarget => {
                    IPCRenderSide.send(IPCActions.FILES.REMOVE_FROM_TAG, linkTarget, SelectedTab?.fullPath);
                  },
                  initCallback: linkTarget => {
                    IPCRenderSide.send(IPCActions.FILES.SYNC_TO_TAG, linkTarget, SelectedTab?.fullPath);
                  },
                }}
                ref={MDEditorRef}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

/**
 * Component for each individual tab
 */

type TTabProps = {
  item: TTabItems;
  isSelected: boolean;
  onClick: () => void;
  onRemove: () => void;
  TabsBGC?: string[];
  TabsDraggingColor?: string;
  CloseBtnBGColor?: string[];
};

export const Tab = ({
  item,
  onClick,
  onRemove,
  isSelected,
  TabsBGC = ['#64748b', '#e2e8f0'], //unselect-selected
  TabsDraggingColor = '#e3e3e3',
  CloseBtnBGColor = ['#fff', '#e3e3e3'], //background forgrounad
}: TTabProps) => {
  return (
    <Reorder.Item
      value={item}
      id={item.filename}
      initial={{ opacity: 0, y: 30 }}
      animate={{
        opacity: 1,
        backgroundColor: isSelected ? TabsBGC[1] : TabsBGC[0],
        y: 0,
        transition: { duration: 0.15 },
      }}
      exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }}
      whileDrag={{ backgroundColor: TabsDraggingColor }}
      className={`flex px-2 py-1.5 ${isSelected ? 'is-selected' : ''}`}
      onMouseDown={ev => ev.preventDefault()}
      onMouseUp={onClick}
    >
      <motion.span
        layout="position"
        className={`${isSelected ? 'font-semibold drop-shadow-lg' : 'text-blue-50'} drop-shadow-md`}
      >{`${item.filename}`}</motion.span>
      <motion.div className="ml-2.5 mt-0.5 flex items-center" layout>
        <motion.button
          onPointerDown={event => {
            event.stopPropagation();
            onRemove();
          }}
          initial={false}
          animate={{
            backgroundColor: isSelected ? CloseBtnBGColor[1] : CloseBtnBGColor[0],
          }}
          className="size-4 rounded-2xl hover:rounded"
        >
          <XMarkIcon className="" />
        </motion.button>
      </motion.div>
    </Reorder.Item>
  );
};

/**
 * Helpers
 */

// close a tab that is not active, return modified arr
function removeItem<T>([...arr]: T[], removingItem: T) {
  let index = arr.indexOf(removingItem);
  index > -1 && arr.splice(index, 1);
  return arr;
}

// close the tab that is currently on, return next valid tab
function closestItem<T>(arr: T[], item: T) {
  const index = arr.indexOf(item);
  if (index === -1) {
    return arr[0];
  } else if (index === arr.length - 1) {
    return arr[arr.length - 2];
  } else {
    return arr[index + 1];
  }
}
