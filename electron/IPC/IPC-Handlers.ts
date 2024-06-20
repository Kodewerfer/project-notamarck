import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;
import * as fs from "node:fs";
import * as path from "node:path";
import {FormatFileSize} from "../Helper.ts";
import {IPCActions} from "./IPC-Actions.ts";
import {app} from "electron";

/**
 * Output the path where the app is located.
 */
const {GET_APP_PATH} = IPCActions.APP;

export function GetAppPath() {
    return app.getAppPath();
}

/**
 * List all files or directories in the given path
 */
const {LIST_CURRENT_PATH} = IPCActions.FILES

export type TListedFile = ReturnType<typeof ListFiles>[0];

export function ListFiles(_Event: IpcMainInvokeEvent, targetPath: string) {
    const files =
        fs.readdirSync(targetPath)
            .map(file => {
                const fileStats = fs.statSync(path.join(targetPath, file));
                return {
                    name: file,
                    size: fileStats.isFile() ? FormatFileSize(fileStats.size ?? 0) : null,
                    directory: fileStats.isDirectory()
                }
            })
            .sort((a, b) => {
                if (a.directory === b.directory) {
                    return a.name.localeCompare(b.name);
                }
                return a.directory ? -1 : 1;
            });
    
    return files
}

// Bind to ipcMain.handle, two-way communications
export const IPCHandlerMappings = [
    {trigger: GET_APP_PATH, handler: GetAppPath},
    {trigger: LIST_CURRENT_PATH, handler: ListFiles},
];

// Bind to ipMain.on, one-way communications
export const IPCListenerMappings = [];
