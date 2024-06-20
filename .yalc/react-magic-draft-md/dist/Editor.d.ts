import React from "react";
import "./Editor.css";
export type TEditorForwardRef = {
    ExtractMD: () => Promise<string>;
};
export type TEditorProps = {
    SourceData?: string | undefined;
};
declare const Editor: React.ForwardRefExoticComponent<TEditorProps & React.RefAttributes<TEditorForwardRef>>;
export default Editor;
