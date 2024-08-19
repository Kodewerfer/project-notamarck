import chokidar, { FSWatcher } from 'chokidar';
import { Stats } from 'node:fs';
import {
  GetActiveFile,
  GetAppMainWindowID,
  GetCurrentWorkspace,
  GetOpenedFiles,
  RemoveOpenedFile,
  SetMDFilesList,
} from '../Data/Globals.ts';
import { BrowserWindow } from 'electron';
import { IPCActions } from '../IPC/IPC-Actions.ts';
import { ListAllMDAsync } from '../Utils/FileOperations.ts';
import { ReassignActiveFile } from '../Utils/GlobalData.ts';

let FilesWatcher: FSWatcher;

async function InitFilesWatcher() {
  if (FilesWatcher) {
    await FilesWatcher.close();
    console.log('Old FilesWatcher Closed');
  }
  // only watches files in main folder
  FilesWatcher = chokidar.watch(GetCurrentWorkspace() + '/*', {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true, //no add handler firing immediately after binding
  });
}

export default async function StartFilesWatcher() {
  await InitFilesWatcher();
  FilesWatcher.on('add', (path, stats) => OnNewFile(path, stats));
  FilesWatcher.on('unlink', (path: string, stats: Stats | undefined) => OnDeleteFile(path, stats));
}

// Add and unlink will also be triggered by rename
async function OnNewFile(path: string, stats: Stats | undefined) {
  const mdFiles = await ListAllMDAsync();
  if (!mdFiles || !mdFiles.length) return;

  SetMDFilesList(mdFiles);

  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.FILES.SIGNAL.MD_LIST_CHANGED);
}

async function OnDeleteFile(deleteFilePath: string, stats: Stats | undefined) {
  // deleted file is the active file
  if (GetActiveFile()?.fullPath === deleteFilePath) {
    ReassignActiveFile();
    BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(
      IPCActions.DATA.PUSH.ACTIVE_FILE_CHANGED,
      GetActiveFile(),
    );
  }

  // delete file is in opened file
  if (RemoveOpenedFile(deleteFilePath))
    BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(
      IPCActions.DATA.PUSH.OPENED_FILES_CHANGED,
      GetOpenedFiles(),
    );

  // set new file list and signal
  const mdFiles = await ListAllMDAsync();
  if (!mdFiles || !mdFiles.length) return;

  SetMDFilesList(mdFiles);

  BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(IPCActions.FILES.SIGNAL.MD_LIST_CHANGED);
}
