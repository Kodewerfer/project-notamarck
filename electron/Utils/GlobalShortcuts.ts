import { BrowserWindow, globalShortcut } from 'electron';
import { GetAppMainWindowID } from '../Data/Globals.ts';
import { IPCActions } from '../IPC/IPC-Actions.ts';
import { ESearchTypes, TSearchTarget } from '../Types/Search.ts';
import { GetLastSearchTargetToken, SetSearchTargetToken } from '../Data/Seach.ts';

const checkFocus = () => BrowserWindow.fromId(GetAppMainWindowID())?.isFocused();

export function SetUpGlobalShortCuts() {
  for (let mapping of KeyMappingConfig) {
    globalShortcut.register(mapping.keyPress, mapping.func);
  }
}

export const KeyMappingDescriptions = [
  {
    keyPress: 'CommandOrControl+S', //saving
    desc: 'Saving',
  },
  {
    keyPress: 'CommandOrControl+N', //New item
    desc: 'New file/tag',
  },
  {
    keyPress: 'CommandOrControl+F', //content search
    desc: 'Search in content',
  },
  {
    keyPress: 'CommandOrControl+Alt+F', // file search
    desc: 'Search in files',
  },
  {
    keyPress: 'CommandOrControl+g', //tag search
    desc: 'Search in tags',
  },
];

export const KeyMappingConfig = [
  {
    keyPress: 'CommandOrControl+S', //saving
    desc: 'Saving',
    func: Saving,
  },
  {
    keyPress: 'CommandOrControl+N', //New item
    desc: 'New file/tag',
    func: NewItem,
  },
  {
    keyPress: 'CommandOrControl+F', //content search
    desc: 'Search in content',
    func: ContentSearch,
  },
  {
    keyPress: 'CommandOrControl+Alt+F', // file search
    desc: 'Search in files',
    func: FileSearch,
  },
  {
    keyPress: 'CommandOrControl+g', //tag search
    desc: 'Search in tags',
    func: TagSearch,
  },
];

function Saving() {
  if (!checkFocus()) return;
  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.SHORT_CUT.SIGNAL.SAVE);
}

function NewItem() {
  if (!checkFocus()) return;
  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.SHORT_CUT.SIGNAL.NEW_ITEM);
}

function ContentSearch() {
  if (!checkFocus()) return;

  const NewFileSearch: TSearchTarget = {
    placeHolder: 'Search File Content',
    searchType: ESearchTypes.Content,
  };

  _SetSearchAndPush(NewFileSearch);
}

function FileSearch() {
  if (!checkFocus()) return;

  const NewFileSearch: TSearchTarget = {
    placeHolder: 'Search Files',
    searchType: ESearchTypes.File,
  };
  _SetSearchAndPush(NewFileSearch);
}

function TagSearch() {
  if (!checkFocus()) return;

  const NewFileSearch: TSearchTarget = {
    placeHolder: 'Search Tags',
    searchType: ESearchTypes.Tag,
  };
  _SetSearchAndPush(NewFileSearch);
}

// --Helpers
function _SetSearchAndPush(NewFileSearch: TSearchTarget) {
  SetSearchTargetToken(NewFileSearch);

  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(
    IPCActions.DATA.PUSH.BEGIN_NEW_SEARCH,
    GetLastSearchTargetToken(),
  );
}
