import {useEffect, useState} from "react";
import * as pathBrowserify from 'path-browserify';
import "./FileExplorer.css";
import {IPCActions} from "../../../electron/IPC/IPC-Actions.ts";
import {TListedFile} from "../../../electron/IPC/ipcMain-return";
// Icons
import {ArchiveBoxIcon} from "@heroicons/react/24/outline";

const {ipcRenderer} = window;

export function FileExplorer() {
    
    const [path, setPath] = useState('');
    const [allFiles, setAllFiles] = useState<TListedFile[]>([]);
    
    async function getFiles() {
        if (path === "") return [];
        return await ipcRenderer.invoke(IPCActions.FILES.LIST_CURRENT_PATH, path);
    }
    
    useEffect(() => {
        (async () => {
            const AppPath = await ipcRenderer.invoke(IPCActions.APP.GET_APP_PATH);
            setPath(AppPath);
        })()
    }, []);
    
    useEffect(() => {
        (async () => {
            const files = await getFiles();
            // setAllFiles(JSON.stringify(files));
            setAllFiles(files);
        })();
    }, [path]);
    
    const onBack = () => setPath(pathBrowserify.dirname(path));
    const onOpen = (pathName: string) => setPath(pathBrowserify.join(path, pathName));
    
    const [searchString, setSearchString] = useState('');
    const filteredFiles = allFiles.filter((s) => s.name.startsWith(searchString));
    
    return (
        <div className={"file-explorer-container container mt-2"}>
            <h1>{path}</h1>
            
            <div>
                <input
                    type={"text"}
                    value={searchString}
                    onChange={ev => setSearchString(ev.target.value)}
                    placeholder={"Search text"}
                    className={"block border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"}
                />
            </div>
            <div className={"mt-4 mb-2"}>
                <FileViewer files={filteredFiles} onOpen={onOpen} onBack={onBack}/>
            </div>
        </div>
    );
}

function FileViewer({files, onBack, onOpen}: {
    files: TListedFile[],
    onBack: () => void,
    onOpen: (pathName: string) => void
}) {
    return (
        <table>
            <tbody>
            <tr>
                <td onClick={() => onBack()}>Back</td>
                <td></td>
                <td></td>
            </tr>
            {files.map(({name, size, directory}) => (
                <tr key={name} onClick={() => {
                    directory && onOpen(name)
                }}>
                    <td>{directory ? (<ArchiveBoxIcon/>) : ""}</td>
                    <td>{name}</td>
                    <td>{directory ? "" : size}</td>
                </tr>
            ))}
            </tbody>
        </table>
    )
}