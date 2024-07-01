// bind with ipcMain.handle
export const IPCActions = {
    APP: {
        GET_APP_PATH: "APP:GET_APP_PATH",
    },
    DIALOG: {
        SHOW_SELECTION_DIR: "DIALOG:SHOW_SELECTION_DIR",
    },
    FILES: {
        LIST_CURRENT_PATH: "FILES:LIST_CURRENT_PATH",
        LIST_CURRENT_PATH_MD: "FILES:LIST_CURRENT_PATH_MD",
        READ_MD_PATH: "FILES:READ_MD_PATH"
    }
}