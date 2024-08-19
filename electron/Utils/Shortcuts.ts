import { BrowserWindow, globalShortcut } from 'electron';
import { GetAppMainWindowID } from '../Data/Globals.ts';
import { IPCActions } from '../IPC/IPC-Actions.ts';

const checkFocus = () => BrowserWindow.fromId(GetAppMainWindowID())?.isFocused();

export function SetUpGlobalShortCuts() {
  for (let mapping of Mapings) {
    globalShortcut.register(mapping.key, mapping.func);
  }
}

const Mapings = [
  {
    key: 'CommandOrControl+S', //saving
    func: Saving,
  },
  {
    key: 'CommandOrControl+N', //saving
    func: NewItem,
  },
  {
    key: 'CommandOrControl+F', //content search
    func: ContentSearch,
  },
  {
    key: 'CommandOrControl+Alt+F', // file search
    func: FileSearch,
  },
  {
    key: 'CommandOrControl+g', //tag search
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
  if (checkFocus()) console.log('CONTENT!');
}

function FileSearch() {
  if (checkFocus()) console.log('FILE!');
}

function TagSearch() {
  if (checkFocus()) console.log('TAG!');
}
