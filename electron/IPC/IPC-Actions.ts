// bind with ipcMain.handle
export const IPCActions = {
  APP: {
    GET_APP_PATH: 'APP:GET_APP_PATH',
    GET_WORK_SPACE: 'APP:GET_WORK_SPACE',
    GET_RECENT_WORK_SPACES: 'APP:GET_RECENT_WORK_SPACES',
    SET_WORK_SPACE: 'APP:SET_WORK_SPACE',
    PUSH: {
      WORK_SPACE_CHANGED: 'APP:PUSH:WORK_SPACE_CHANGED',
      RECENT_WORK_SPACES_CHANGED: 'APP:PUSH:RECENT_WORK_SPACES_CHANGED',
    },
  },
  DIALOG: {
    SHOW_MESSAGE_DIALOG: 'DIALOG:SHOW_MESSAGE_DIALOG',
    SHOW_SELECTION_DIR: 'DIALOG:SHOW_SELECTION_DIR',
  },
  DATA: {
    GET_ALL_OPENED_FILES: 'DATA:GET_ALL_OPENED_FILES',
    PUSH_ALL_OPENED_FILES: 'DATA:PUSH_ALL_OPENED_FILES', //like the previous one but push to all listening component in the renderer
    CLOSE_OPENED_FILES: 'DATA:CLOSE_OPENED_FILES',
    CLOSE_ALL_OPENED_FILES: 'DATA:CLOSE_ALL_OPENED_FILES',
    PUSH: {
      OPENED_FILES_CHANGED: 'DATA:PUSH:OPENED_FILES_CHANGED', // main to rendered, similar to server side pushing
    },
  },
  FILES: {
    LIST_CURRENT_PATH: 'FILES:LIST_CURRENT_PATH',
    LIST_CURRENT_PATH_MD: 'FILES:LIST_CURRENT_PATH_MD',
    CREATE_NEW_FILE: 'FILES:CREATE_NEW_FILE',
    READ_MD_FROM_PATH: 'FILES:READ_MD_FROM_PATH',
    CHANGE_FILE_CONTENT: 'FILES:CHANGE_FILE_CONTENT', //render to main
    CHANGE_ACTIVE_FILE: 'FILES:CHANGE_ACTIVE_FILE',
    SAVE_ACTIVE_FILE: 'FILE:SAVE_ACTIVE_FILE',
    SAVE_ALL_OPENED_FILES: 'FILE:SAVE_ALL_OPENED_FILES',
    SAVE_TARGET_FILE: 'FILE:SAVE_TARGET_FILE',
    PUSH: {
      ACTIVE_FILE_CHANGED: 'FILES:PUSH:ACTIVE_FILE_CHANGED',
      FILE_CONTENT_CHANGED: 'FILES:PUSH:FILE_CONTENT_CHANGED', //main to render
    },
    // signals don't send a payload
    SIGNAL: {
      MD_LIST_CHANGED: 'FILES:SIGNAL:MD_LIST_CHANGED',
    },
  },
};
