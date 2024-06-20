import React from 'react'
import ReactDOM from 'react-dom/client'
// import App from './App.tsx'
import {FileExplorer} from "./component/FileExplorer/FileExplorer.tsx";
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {/*<App/>*/}
        <FileExplorer/>
    </React.StrictMode>,
)

// Use contextBridge
window.ipcRenderer && window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
})
