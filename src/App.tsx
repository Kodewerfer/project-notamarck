import {useEffect, useRef, useState} from "react";
import * as pathBrowserify from 'path-browserify';
import "./App.css";
import Editor, {TEditorForwardRef} from "react-magic-draft-md";

import {IPCActions} from "../electron/IPC/IPC-Actions.ts";

const {ipcRenderer} = window;

export default function App() {
    const EditorRef = useRef<TEditorForwardRef>(null);
    
    const [MDData, setMDData] = useState('');
    
    useEffect(() => {
        (async () => {
            const AppPath = await ipcRenderer.invoke(IPCActions.APP.GET_APP_PATH);
            let MDContent = '';
            try {
                // MDContent = await ipcRenderer.invoke(IPCActions.FILES.READ_MD_PATH, pathBrowserify.join(AppPath, "test.md"));
            } catch (e) {
                console.error(e);
            }
            setMDData(MDContent);
        })()
    }, []);
    
    async function appClick() {
        console.log("NOTAMARCK click");
        if (EditorRef.current) {
            console.log(await EditorRef.current.ExtractMD());
        }
    }
    
    async function showDialog() {
        console.log("showing dialog");
        const DIRPath = await ipcRenderer.invoke(IPCActions.DIALOG.SHOW_SELECTION_DIR);
        //Invalid
        if (!DIRPath || DIRPath.length > 1) return;
        // Only one folder should be allowed to choose at a time
        console.log(DIRPath[0]);
        
    }
    
    return (
        <div className="App">
            <button className={"bg-blue-500"} onClick={showDialog}>
                Show Dialog
            </button>
            <button className={"bg-amber-600"} onClick={appClick}>
                NOTAMARCK EXTRACT
            </button>
            <main className="Main-wrapper">
                <Editor SourceData={MDData} ref={EditorRef}/>
            </main>
        </div>
    );
}
