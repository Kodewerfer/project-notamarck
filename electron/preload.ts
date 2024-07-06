import { ipcRenderer, contextBridge } from 'electron';

export type TExposedAPIType = typeof ExposedAPI;

const ExposedAPI = {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    const sub = (event: Electron.IpcRendererEvent, ...args: any[]) => listener(event, ...args);
    ipcRenderer.on(channel, sub);
    return () => {
      // clean up for the handler
      ipcRenderer.removeListener(channel, sub);
    };
  },
  // Due to ipcRenderer.on is not directly exposed, the ipcRenderer.off won't work the way it should
  // off(...args: Parameters<typeof ipcRenderer.off>) {
  //   const [channel, ...omit] = args;
  //   return ipcRenderer.off(channel, ...omit);
  // },
  removeAllListeners(...args: Parameters<typeof ipcRenderer.removeAllListeners>) {
    const [channel] = args;
    return ipcRenderer.removeAllListeners(channel);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
  // ...
};

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('IPCRenderSide', ExposedAPI);
