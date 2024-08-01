import { useContext, useEffect, useRef, useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/16/solid';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { useLayoutEffect } from '@tanstack/react-router';
import MarkdownEditor, { TEditorComponentRef } from 'component/base/MarkdownEditor.tsx';
import MainFrameContext from '@/context/MainFrameContext.ts';
import { TFileInMemory } from 'electron-src/Types/GlobalData.ts';
import { TChangedFilesPayload } from 'electron-src/Types/IPC.ts';

// Identifying info a tab holds, in addition to fs related props, add selection cache
export type TTabItems = TFileInMemory & {
  selectionCache?: Object | null;
};

const { IPCRenderSide } = window;
export default function TabFrame() {
  const [Tabs, setTabs] = useState<TTabItems[]>([]);
  // NOTE: active tab/SelectedTab is not fetched from main, when the frame init and tabs has data, SelectedTab will be the first in order and send to main
  const [SelectedTab, setSelectedTab] = useState<TTabItems | null | undefined>(null);

  const MDEditorRef = useRef<TEditorComponentRef | null>(null);
  const TabBarRef = useRef<HTMLElement | null>(null);

  // Passed down from main frame context
  const mainFrameScrollable = useContext(MainFrameContext);

  // extract editor's content then send it to main process, mainly used when SelectedTab changed
  async function SendCurrentTabContentToMain() {
    if (MDEditorRef.current && SelectedTab)
      IPCRenderSide.send(
        IPCActions.DATA.UPDATE_OPENED_FILE_CONTENT,
        SelectedTab.fullPath,
        await MDEditorRef.current.ExtractMD(),
      );
  }

  // init component
  useLayoutEffect(() => {
    (async () => {
      const AllOpenedFiles: TTabItems[] = await IPCRenderSide.invoke(IPCActions.DATA.GET_ALL_OPENED_FILES);
      if (Array.isArray(AllOpenedFiles) && Tabs.length === 0) setTabs(AllOpenedFiles);
    })();
  }, []);

  // ini the selected tab if non-exist
  useEffect(() => {
    if (!SelectedTab) {
      setSelectedTab(Tabs[0]);
      IPCRenderSide.send(IPCActions.DATA.CHANGE_ACTIVE_FILE, Tabs[0]);
    }
  }, [Tabs]);

  // Critical: Bind to main process' push events, sync tab's data to main
  useLayoutEffect(() => {
    // whenever a new file is opened/closed on main
    const unbindOpenedFileChange = IPCRenderSide.on(
      IPCActions.DATA.PUSH.OPENED_FILES_CHANGED,
      (_, payload: TTabItems[]) => {
        if (!payload || !Array.isArray(payload)) return;

        const TabsMap = new Map(Tabs.map(tabItem => [tabItem.fullPath, tabItem]));
        const Added = payload.filter(fileItem => !TabsMap.has(fileItem.fullPath));

        const payloadPathMap = new Map(payload.map(fileItem => [fileItem.fullPath, fileItem]));
        const FilteredTabs = Tabs.filter(tabItem => payloadPathMap.has(tabItem.fullPath));

        if (Added.length) {
          console.log('Tab Frame: New Tab -', Added);
        }

        setTabs(FilteredTabs.concat(Added));
      },
    );

    // whenever a file's content has been changed on main(could be pushed by this component)
    const unbindFileContentChange = IPCRenderSide.on(
      IPCActions.DATA.PUSH.OPENED_FILE_CONTENT_CHANGED,
      (_, payload: TChangedFilesPayload[]) => {
        const TabsMap = new Map(Tabs.map(tabItem => [tabItem.fullPath, tabItem]));
        payload.forEach(item => {
          if (TabsMap.get(item.TargetFilePath)) {
            TabsMap.set(item.TargetFilePath, item.NewFile);
          }
        });
        const TabsArrayFromArray = Array.from(TabsMap, ([_key, value]) => value);

        setTabs(TabsArrayFromArray);
      },
    );

    // whenever a file is set to be activated on main, could be the result of opening a file, new or not
    const unbindFileActivationChange = IPCRenderSide.on(
      IPCActions.DATA.PUSH.ACTIVE_FILE_CHANGED,
      (_, payload: TFileInMemory | null) => {
        if (!payload) return setSelectedTab(null);

        if (payload.fullPath === SelectedTab?.fullPath) return;

        const tabIndex = Tabs.findIndex(item => item.fullPath === payload.fullPath);
        if (tabIndex === -1) return;
        SendCurrentTabContentToMain();
        (async () => {
          if (SelectedTab)
            await IPCRenderSide.invoke(
              IPCActions.DATA.UPDATE_SELECTION_STATUS_CACHE,
              SelectedTab.fullPath,
              MDEditorRef.current?.ExtractSelection(),
            );
          setSelectedTab(Tabs[tabIndex]);
        })();
      },
    );

    return () => {
      unbindOpenedFileChange();
      unbindFileContentChange();
      unbindFileActivationChange();
    };
  });

  const onSelectTab = async (item: TTabItems) => {
    await SendCurrentTabContentToMain();
    if (SelectedTab && item !== SelectedTab)
      // save the caret info from the currently selected tab
      await IPCRenderSide.invoke(
        IPCActions.DATA.UPDATE_SELECTION_STATUS_CACHE,
        SelectedTab.fullPath,
        MDEditorRef.current?.ExtractSelection(),
      );

    // NOTE:setting the SelectedTab is not exactly required because main process will put into it after the next line.
    setSelectedTab(item);
    IPCRenderSide.send(IPCActions.DATA.CHANGE_ACTIVE_FILE, item);
  };

  const onCloseTab = async (item: TTabItems) => {
    // Notify backend
    if (item === SelectedTab) {
      await SendCurrentTabContentToMain();
      await IPCRenderSide.invoke(
        IPCActions.DATA.UPDATE_SELECTION_STATUS_CACHE,
        SelectedTab.fullPath,
        MDEditorRef.current?.ExtractSelection(),
      );
      const nextTab = closestItem(Tabs, item);
      setSelectedTab(nextTab);
      IPCRenderSide.send(IPCActions.DATA.CHANGE_ACTIVE_FILE, nextTab);
    }

    setTabs(removeItem(Tabs, item));
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
    if (!SelectedTab || !Tabs) return;
    const cachedSelection = await IPCRenderSide.invoke(
      IPCActions.DATA.GET_SELECTION_STATUS_CACHE,
      SelectedTab.fullPath,
    );
    MDEditorRef.current?.SetSelection(cachedSelection);

    // force the code to run at the end of the even loop
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      try {
        range.setStart(selection.anchorNode!, selection.anchorOffset);
        range.setEnd(selection.focusNode!, selection.focusOffset);
      } catch (e) {
        console.warn('Reference anchor setup failed,', e);
      }
      const { top } = range.getBoundingClientRect();
      if (mainFrameScrollable?.current) {
        const divTop = mainFrameScrollable.current.getBoundingClientRect().top;
        const tabBarHeight = (TabBarRef?.current && TabBarRef.current.scrollHeight) || 0;
        mainFrameScrollable.current.scrollTop = top - divTop - tabBarHeight * 3;
      }
    }, 0);
  };
  // unused for now
  const onSubEditorUnmounted = async () => {};

  return (
    <>
      {/*the tab row*/}
      <nav
        ref={TabBarRef}
        className={`sticky top-0 z-20 flex h-9 w-full overflow-hidden bg-slate-300 text-slate-800 dark:bg-slate-400 ${Tabs.length === 0 && 'hidden'}`}
      >
        <Reorder.Group as="ul" axis="x" onReorder={setTabs} className="flex flex-nowrap text-nowrap" values={Tabs}>
          <AnimatePresence initial={false}>
            {Tabs.map((item: TTabItems) => (
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
      <section className={`z-10 px-2 pb-5 pl-4 pt-3 ${Tabs.length === 0 && 'hidden'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            className={'animate-wrapper h-full'} //marking the usage, no real purpose
            key={SelectedTab ? SelectedTab.filename : 'empty'}
            animate={{ opacity: 1, y: 0, left: 0 }}
            initial={{ opacity: 0, y: 20 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.15 }}
          >
            {SelectedTab && (
              <MarkdownEditor
                onEditorMounted={onSubEditorMounted}
                onEditorUnmounted={onSubEditorUnmounted}
                ref={MDEditorRef}
                MDSource={SelectedTab.content || ''}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </>
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
  TabsBGC = ['#fff', '#f3f3f3'],
  TabsDraggingColor = '#e3e3e3',
  CloseBtnBGColor = ['#fff', '#e3e3e3'],
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
      onPointerDown={onClick}
    >
      <motion.span layout="position">{`${item.filename}`}</motion.span>
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
          className="size-4"
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
