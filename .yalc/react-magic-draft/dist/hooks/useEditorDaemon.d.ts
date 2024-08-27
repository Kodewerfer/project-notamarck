/**
 *  This hook handles the backend heavy lifting
 *
 *  At its core, it monitors the changes made in the first ref(the watched ref), rolls them back, and performs the same operation on the second ref(the mirrored ref).
 *  The reason for this convoluted logic is that, for the best UX, I made the main editing area as an editable HTML element that handles rendering of MD as well as user-editing.
 *  it allowed editing and rendering on the fly, but it also means that the virtual DOM and the actual DOM are now out of sync.
 *  If I've simply turned the actual DOM back to React compos again, React will crash because it may need to remove elements that are no longer there, etc.
 *  So, the original DOM needs to be kept as-is; the changes will be made on the other DOM ref instead, which will later be turned to React components so that React can do proper diffing and DOM manipulation.
 */
export declare const ParagraphTest: RegExp;
export type TSyncOperation = {
    type: 'TEXT' | 'ADD' | 'REMOVE' | 'REPLACE' | 'ATTR';
    fromTextHandler?: boolean;
    IsAdditional?: boolean;
    newNode?: Node | (() => Node);
    targetNode?: Node | (() => Node);
    targetNodeXP?: string;
    nodeText?: string | null;
    nodeTextOld?: string | null;
    parentXP?: string | null;
    parentNode?: Node | (() => Node);
    siblingXP?: string | null;
    siblingNode?: Node | undefined | null;
    attribute?: {
        name: string;
        value: string;
    };
};
export type TSelectionStatus = {
    AnchorNodeXPath: string;
    StartingOffset: number;
    SelectionExtent: number;
    AnchorNodeXPathConcise: string;
};
type TDOMTrigger = 'add' | 'remove' | 'text' | 'any';
export type TIgnoreMap = Map<Node, TDOMTrigger>;
export type TElementOperation = Map<Node, {
    Trigger: TDOMTrigger;
    Operations: TSyncOperation | TSyncOperation[];
}>;
type THookOptions = {
    TextNodeCallback?: (textNode: Node) => Node[] | null | undefined;
    OnRollback?: Function | undefined;
    DebounceSyncDelay: number;
    ShouldObserve: boolean;
    ShouldLog: boolean;
    IsEditable: boolean;
    ShouldFocus: boolean;
    ParagraphTags: RegExp;
    HistoryLength: number;
};
type TCaretToken = 'zero' | 'PrevElement' | 'PrevLine' | 'NextLine' | 'NextEditable' | 'NextElement' | null;
export type TDaemonReturn = {
    SyncNow: () => Promise<void>;
    GetSelectionStatus: () => TSelectionStatus | null;
    SetSelectionStatus: (status: TSelectionStatus, ShouldOverride?: boolean) => void;
    DiscardHistory: (DiscardCount: number) => void;
    SetFutureCaret: (token: TCaretToken) => void;
    AddToIgnore: (Element: Node | HTMLElement | Node[], Type: TDOMTrigger, bIncludeAllChild?: boolean) => void;
    AddToBindOperations: (Element: Node, Trigger: TDOMTrigger, Operation: TSyncOperation | TSyncOperation[]) => void;
    AddToOperations: (Operation: TSyncOperation | TSyncOperation[], ShouldLockPage?: boolean) => void;
};
export default function useEditorDaemon(EditorElementRef: {
    current: HTMLElement | undefined | null;
}, MirrorDocumentRef: {
    current: Document | undefined | null;
}, FinalizeChanges: Function, Options: Partial<THookOptions>): TDaemonReturn;
export {};
