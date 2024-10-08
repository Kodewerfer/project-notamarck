import chokidar, { FSWatcher } from 'chokidar';
import { GetTagFolderFullPath, ReadTagRawAsync, ResetAndCacheTagsListAsync } from '../Utils/TagOperations.ts';
import { IPCActions } from '../IPC/IPC-Actions.ts';
import { Stats } from 'node:fs';
import { BrowserWindow } from 'electron';
import { ShowErrorAlert } from '../Utils/ErrorsAndPrompts.ts';
import { CheckForTagRenaming, GetEditingTag, RemoveFromTagMap, SetEditingTag, SetTagMapByItem } from '../Data/Tags.ts';
import path from 'node:path';
import { GetAppMainWindowID } from '../Data/Globals.ts';
import { TTagsInMemory } from 'electron-src/Types/Tags.ts';
import _ from 'lodash';

let TagsWatcher: FSWatcher;

async function InitTagsWatcher() {
  if (TagsWatcher) {
    await TagsWatcher.close();
    console.log('Old TagsWatcher Closed');
  }

  TagsWatcher = chokidar.watch(GetTagFolderFullPath(), {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true, //no add handler firing immediately after binding
  });
}

export default async function StartTagsWatcher() {
  await InitTagsWatcher();
  TagsWatcher.on('add', () => debouncedAddNewTagToCache());
  TagsWatcher.on('unlink', (path: string, stats: Stats | undefined) => removeTagFromCache(path, stats));
  TagsWatcher.on('change', (path: string, stats: Stats | undefined) => ReloadTagContent(path, stats));
}

// Handlers
const debouncedAddNewTagToCache = _.debounce(() => {
  ResetAndCacheTagsListAsync();
}, 200);

// todo:remove the tag's reference in md files
async function removeTagFromCache(tagPath: string, _: Stats | undefined) {
  const { base: TagNameKey } = path.parse(tagPath);
  RemoveFromTagMap(TagNameKey);

  // will only signal for list change if it is not being renamed
  if (!CheckForTagRenaming(tagPath))
    BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.FILES.SIGNAL.TAG_LIST_CHANGED);

  //if the deleted tag is also the tag in editing, reset the editing tag to null, will only push the null to renderer if it is not being renamed
  if (tagPath === GetEditingTag()?.tagPath) {
    SetEditingTag(null);
    if (!CheckForTagRenaming(tagPath))
      BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.DATA.PUSH.EDITING_TAG_CHANGED, null);
  }
}

async function ReloadTagContent(tagPath: string, _: Stats | undefined) {
  let ChangedTag;
  try {
    ChangedTag = await ReadTagRawAsync(tagPath);
  } catch (e) {
    ShowErrorAlert('File Access Error', (e as Error)?.message);
    return;
  }

  SetTagMapByItem(ChangedTag);

  //
  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(
    IPCActions.DATA.PUSH.TAG_CONTENT_CHANGED,
    ChangedTag as TTagsInMemory,
  );
}
