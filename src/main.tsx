import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { TExposedAPIType } from 'electron-src/preload.ts';
import './main.css';

// Create a new router instance
export const MainRouter = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof MainRouter;
  }
}
// Type safety for IPC renderer
declare global {
  interface Window {
    IPCRenderSide: TExposedAPIType;
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={MainRouter} />
  </React.StrictMode>,
);

// Use contextBridge
window.ipcRenderer &&
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message);
  });
