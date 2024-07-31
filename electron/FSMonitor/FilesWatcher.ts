import chokidar, { FSWatcher } from 'chokidar';
import { Stats } from 'node:fs';
import { GetAppMainWindowID, GetCurrentWorkspace } from '../Storage/Globals.ts';
import { BrowserWindow } from 'electron';
import { IPCActions } from '../IPC/IPC-Actions.ts';

let FilesWatcher: FSWatcher;

function InitFilesWatcher() {
  if (!FilesWatcher)
    // only watches files in main folder
    FilesWatcher = chokidar.watch(GetCurrentWorkspace() + '/*', {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true, //no add handler firing immediately after binding
    });
}

export default function StartFilesWatcher() {
  if (!FilesWatcher) InitFilesWatcher();
  FilesWatcher.on('add', (path, stats) => OnNewFile(path, stats));
  FilesWatcher.on('unlink', (path: string, stats: Stats | undefined) => OnDeleteFile(path, stats));
}

function OnNewFile(path: string, stats: Stats | undefined) {
  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.FILES.SIGNAL.MD_LIST_CHANGED);
}

function OnDeleteFile(path: string, stats: Stats | undefined) {
  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.FILES.SIGNAL.MD_LIST_CHANGED);
}
