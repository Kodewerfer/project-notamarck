import { useEffect, useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/16/solid';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { useLayoutEffect } from '@tanstack/react-router';
import MarkdownEditor from 'component/MarkdownEditor.tsx';

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

  // init component
  useLayoutEffect(() => {
    (async () => {
      const AllOpenedFiles: TTabItems[] = await IPCRenderSide.invoke(IPCActions.DATA.GET_ALL_OPENED_FILES);
      if (Array.isArray(AllOpenedFiles) && Tabs.length === 0) setTabs(AllOpenedFiles);
    })();
  }, []);

  // Listen to main process update on opened files
  useLayoutEffect(() => {
    const EventCleanup = IPCRenderSide.on(IPCActions.DATA.PUSH.OPENED_FILES_CHANGED, (_, payload: TTabItems[]) => {
      console.log('server data:', payload);

      if (!payload || !Array.isArray(payload)) return;

      const TabsMap = new Map(Tabs.map(tabItem => [tabItem.fullPath, tabItem]));
      const Added = payload.filter(fileItem => !TabsMap.has(fileItem.fullPath));

      const payloadPathMap = new Map(payload.map(fileItem => [fileItem.fullPath, fileItem]));
      const FilteredTabs = Tabs.filter(tabItem => payloadPathMap.has(tabItem.fullPath));

      if (Added.length) {
        console.log('Tab Frame: New Tab -', Added);
      }

      setTabs(FilteredTabs.concat(Added));
    });

    return () => {
      EventCleanup();
    };
  });

  useEffect(() => {
    if (!SelectedTab) setSelectedTab(Tabs[0]);
  }, [Tabs]);

  const remove = (item: TTabItems) => {
    // Notify backend
    if (item === SelectedTab) {
      setSelectedTab(closestItem(Tabs, item));
    }

    setTabs(removeItem(Tabs, item));
    IPCRenderSide.invoke(IPCActions.DATA.CLOSE_OPENED_FILES, item);
  };

  // const add = () => {
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
                onClick={() => setSelectedTab(item)}
                onRemove={() => remove(item)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
        <motion.button
          className="mx-2 size-6 self-center"
          // onClick={add}
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
            {SelectedTab && SelectedTab.content ? <MarkdownEditor MDSource={SelectedTab.content} /> : ''}
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
