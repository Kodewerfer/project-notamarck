import { useEffect, useRef, useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/16/solid';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { useLayoutEffect } from '@tanstack/react-router';
import MarkdownEditor, { TEditorComponentRef } from 'component/base/MarkdownEditor.tsx';
import { TChangedFilesPayload } from 'electron-src/IPC/IPC-Listeners.ts';
import { TOpenedFiles } from 'electron-src/Storage/Globals.ts';

// Identifying info a tab holds
export type TTabItems = {
  filename: string;
  fullPath: string;
  title?: string;
  content?: string;
};

const { IPCRenderSide } = window;
export default function TabFrame() {
  const [Tabs, setTabs] = useState<TTabItems[]>([]);
  const [SelectedTab, setSelectedTab] = useState(Tabs[0]);

  const MDEditorRef = useRef<TEditorComponentRef | null>(null);

  // extra editor's content then send it to main process, mainly used when SelectedTab changed
  async function SendCurrentTabContentToMain() {
    if (MDEditorRef.current)
      IPCRenderSide.send(
        IPCActions.FILES.CHANGE_FILE_CONTENT,
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
    if (!SelectedTab) setSelectedTab(Tabs[0]);
  }, [Tabs]);

  // Critical: Bind to main process' push events, sync tab's data to main
  useLayoutEffect(() => {
    // whenever a new file is opened/closed on main
    const unbindOpenedFileChange = IPCRenderSide.on(
      IPCActions.DATA.PUSH.OPENED_FILES_CHANGED,
      (_, payload: TTabItems[]) => {
        // console.log('server data:', payload);

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
      IPCActions.FILES.PUSH.FILE_CONTENT_CHANGED,
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
      IPCActions.FILES.PUSH.ACTIVE_FILE_CHANGED,
      (_, payload: TOpenedFiles | null) => {
        if (!payload) {
          console.error('Tabs Frame: ACTIVE_FILE_CHANGED pushed null result.');
          return;
        }
        const tabIndex = Tabs.findIndex(item => item.fullPath === payload.fullPath);
        if (tabIndex === -1) return;
        SendCurrentTabContentToMain();
        setSelectedTab(Tabs[tabIndex]);
      },
    );

    return () => {
      unbindOpenedFileChange();
      unbindFileContentChange();
      unbindFileActivationChange();
    };
  });

  const onSelectTab = async (item: TTabItems) => {
    // if (item === SelectedTab) {
    //   console.log('same tab');
    //   return;
    // }

    await SendCurrentTabContentToMain();
    setSelectedTab(item);
  };

  const onCloseTab = (item: TTabItems) => {
    // Notify backend
    if (item === SelectedTab) {
      setSelectedTab(closestItem(Tabs, item));
    }

    setTabs(removeItem(Tabs, item));
    IPCRenderSide.invoke(IPCActions.DATA.CLOSE_OPENED_FILES, item);
  };

  // const onAddTab = () => {
  //   const nextItem = generateNextTab(tabs)
  //
  //   if (nextItem) {
  //     setTabs([...tabs, nextItem]);
  //     setSelectedTab(nextItem);
  //   }
  // };

  return (
    <>
      {/*the tab row*/}
      <nav className="flex overflow-hidden bg-slate-300 text-slate-800 dark:bg-slate-400">
        <Reorder.Group as="ul" axis="x" onReorder={setTabs} className="flex flex-nowrap text-nowrap" values={Tabs}>
          <AnimatePresence initial={false}>
            {Tabs.map((item: TTabItems) => (
              <Tab
                key={item.filename}
                item={item}
                isSelected={SelectedTab === item}
                onClick={() => onSelectTab(item)}
                onRemove={() => onCloseTab(item)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
        <motion.button
          className="mx-2 size-6 self-center"
          // onClick={onAddTab}
          disabled={false}
          whileTap={{ scale: 0.9 }}
        >
          <PlusIcon />
        </motion.button>
      </nav>
      {/* content for the tab */}
      <section className={'px-2 pl-4 pt-2'}>
        <AnimatePresence mode="wait">
          <motion.div
            className={'animate-wrapper'} //marking the usage, no real purpose
            key={SelectedTab ? SelectedTab.filename : 'empty'}
            animate={{ opacity: 1, y: 0, left: 0 }}
            initial={{ opacity: 0, y: 20 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.15 }}
          >
            {SelectedTab && SelectedTab.content ? (
              <MarkdownEditor ref={MDEditorRef} MDSource={SelectedTab.content} />
            ) : (
              ''
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
