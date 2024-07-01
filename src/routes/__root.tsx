import {useState} from "react";

import {createRootRoute, Link, Outlet} from '@tanstack/react-router'
import {TanStackRouterDevtools} from '@tanstack/router-devtools'

import {IPCActions} from "electron-src/IPC/IPC-Actions.ts";
import * as pathBrowserify from 'path-browserify';
import {TMDFile} from "electron-src/IPC/IPC-Handlers.ts";

const {ipcRenderer} = window;

export const Route = createRootRoute({
    loader: async () => {
        let MdFiles = [];
        try {
            const AppPath = await ipcRenderer.invoke(IPCActions.APP.GET_APP_PATH);
            MdFiles = await ipcRenderer.invoke(IPCActions.FILES.LIST_CURRENT_PATH_MD, pathBrowserify.join(AppPath, "/testfolder"));
        } catch (e) {
            console.error(e);
        }
        return MdFiles;
    },
    component: RootComponent
})

function RootComponent() {
    
    const [MDFiles] = useState<TMDFile[]>(Route.useLoaderData());
    
    return (
        <>
            <div>
                <ul>
                    {MDFiles.map(item => {
                        return (
                            <li key={item.path}>
                                <Link to="/edit/$filepath"
                                      params={{
                                          filepath: item.path,
                                      }}>
                                    {item.name}
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </div>
            <hr/>
            <Outlet/>
            <TanStackRouterDevtools/>
        </>
    )
}