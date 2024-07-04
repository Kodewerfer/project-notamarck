import { useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/16/solid';

// Identifying info a tab holds
type TTabItems = {
  filename: string;
  title?: string;
  content?: string;
};

const testingtabs: TTabItems[] = [
  { filename: 'file1' },
  { filename: 'file2' },
  { filename: 'file3' },
  { filename: 'file4', content: '112233445566' },
];

export function TabFrame({ TabsData }: { TabsData?: TTabItems[] }) {
  const [tabs, setTabs] = useState(testingtabs);
  const [selectedTab, setSelectedTab] = useState(tabs[0]);

  const remove = (item: TTabItems) => {
    if (item === selectedTab) {
      setSelectedTab(closestItem(tabs, item));
    }

    setTabs(removeItem(tabs, item));
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
    <div className="flex flex-col bg-slate-600">
      {/*the tab row*/}
      <nav className="flex overflow-hidden bg-slate-400">
        <Reorder.Group as="ul" axis="x" onReorder={setTabs} className="flex flex-nowrap text-nowrap" values={tabs}>
          <AnimatePresence initial={false}>
            {tabs.map((item: TTabItems) => (
              <Tab
                key={item.filename}
                item={item}
                isSelected={selectedTab === item}
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
      <section>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTab ? selectedTab.filename : 'empty'}
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15 }}
          >
            {selectedTab.content ? selectedTab.content : ''}
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
  TabsBGC = ['#f3f3f3', '#fff'],
  TabsDraggingColor = '#e3e3e3',
  CloseBtnBGColor = ['#e3e3e3', '#fff'],
}: TTabProps) => {
  return (
    <Reorder.Item
      value={item}
      id={item.filename}
      initial={{ opacity: 0, y: 30 }}
      animate={{
        opacity: 1,
        backgroundColor: isSelected ? TabsBGC[0] : TabsBGC[1],
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
            backgroundColor: isSelected ? CloseBtnBGColor[0] : CloseBtnBGColor[1],
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
function removeItem<T>([...arr]: T[], item: T) {
  const index = arr.indexOf(item);
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
