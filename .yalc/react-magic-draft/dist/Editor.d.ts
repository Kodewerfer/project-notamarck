import React from "react";
import { TSelectionStatus } from "./hooks/useEditorDaemon";
import "./Editor.css";
export type TEditorForwardRef = {
    FlushChanges: () => Promise<void>;
    ExtractMD: () => Promise<string>;
    ExtractCaretData: () => TSelectionStatus | null;
    SetCaretData: (caretData: TSelectionStatus, ShouldOverride?: boolean) => void;
    InsertText: (TextContent: string, bSyncAfterInsert?: boolean) => void;
    GetDOM: () => {
        root: HTMLElement | null;
        editor: HTMLElement | null;
        mask: HTMLElement | null;
    };
};
export type TComponentCallbacks = {
    FileLinks?: {
        initCallback?: (linkTarget: string) => void | Promise<void>;
        removeCallback?: (linkTarget: string) => void | Promise<void>;
    };
};
export type TEditorCallbacks = {
    OnInit: (HTMLString: string) => void;
    OnReload: (HTMLString: string) => void;
};
export type TEditorProps = {
    SourceData?: string | undefined;
    KeepBrs?: boolean;
    EditorCallBacks?: TEditorCallbacks;
    ComponentCallbacks?: TComponentCallbacks;
    DebounceSyncDelay?: number;
    DaemonShouldLog?: boolean;
    IsEditable?: boolean;
    AutoFocus?: boolean;
    HistoryLength?: number;
    [key: string]: any;
};
declare const Editor: React.ForwardRefExoticComponent<Omit<TEditorProps, "ref"> & React.RefAttributes<TEditorForwardRef>>;
export default Editor;
