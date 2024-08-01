import chokidar, { FSWatcher } from 'chokidar';
import { GetTagFolderFullPath, ReadTagAsync } from '../Utils/TagOperations.ts';
import { IPCActions } from '../IPC/IPC-Actions.ts';
import { Stats } from 'node:fs';
import { BrowserWindow } from 'electron';
import { ShowErrorAlert } from '../Utils/ErrorsAndPrompts.ts';
import { RemoveFromTagMap, SetTagMap } from '../Data/Tags.ts';
import path from 'node:path';
import { GetAppMainWindowID } from '../Data/Globals.ts';

let TagsWatcher: FSWatcher;

function InitTagsWatcher() {
  if (!TagsWatcher)
    TagsWatcher = chokidar.watch(GetTagFolderFullPath(), {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true, //no add handler firing immediately after binding
    });
}

export default function StartTagsWatcher() {
  if (!TagsWatcher) InitTagsWatcher();
  TagsWatcher.on('add', (path, stats) => OnNewTag(path, stats));
  TagsWatcher.on('unlink', (path: string, stats: Stats | undefined) => OnDeleteTag(path, stats));
}

// Handlers
async function OnNewTag(tagPath: string, _: Stats | undefined) {
  let NewTagData;
  try {
    NewTagData = await ReadTagAsync(tagPath);
  } catch (e) {
    ShowErrorAlert('File Access Error', (e as Error)?.message);
    return;
  }
  SetTagMap(NewTagData);
  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.FILES.SIGNAL.TAG_LIST_CHANGED);
}

async function OnDeleteTag(tagPath: string, _: Stats | undefined) {
  const { base: TagNameKey } = path.parse(tagPath);
  RemoveFromTagMap(TagNameKey);
  //
  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.FILES.SIGNAL.TAG_LIST_CHANGED);
}
