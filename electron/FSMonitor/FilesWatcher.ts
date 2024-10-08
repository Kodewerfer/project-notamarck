import chokidar, { FSWatcher } from 'chokidar';
// import { Stats } from 'node:fs';
import {
  GetActiveFile,
  GetAppMainWindowID,
  GetCurrentWorkspace,
  GetOpenedFiles,
  RemoveOpenedFile,
} from '../Data/Globals.ts';
import { BrowserWindow } from 'electron';
import { IPCActions } from '../IPC/IPC-Actions.ts';
import { ResetAndCacheMDFilesListAsync } from '../Utils/FileOperations.ts';
import { ReassignActiveFile } from '../Utils/GlobalData.ts';
import _ from 'lodash';

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
  FilesWatcher.on('add', () => OnNewFile());
  FilesWatcher.on('unlink', (path: string) => OnDeleteFile(path));
}

// Add and unlink will also be triggered by rename
const OnNewFile = _.debounce(() => {
  ResetAndCacheMDFilesListAsync();
}, 200);

async function OnDeleteFile(deleteFilePath: string) {
  // delete file is in opened file
  if (RemoveOpenedFile(deleteFilePath))
    BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(
      IPCActions.DATA.PUSH.OPENED_FILES_CHANGED,
      GetOpenedFiles(),
    );

  // deleted file is the active file
  if (GetActiveFile()?.fullPath === deleteFilePath) {
    ReassignActiveFile();
    BrowserWindow.fromId(GetAppMainWindowID())?.webContents.send(
      IPCActions.DATA.PUSH.ACTIVE_FILE_CHANGED,
      GetActiveFile(),
    );
  }

  ResetAndCacheMDFilesListAsync();
}
