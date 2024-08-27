import React from "react";
import { TDaemonReturn } from "../hooks/useEditorDaemon";
export declare function Blockquote({ children, tagName, parentSetActivation, daemonHandle, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    tagName: string;
    parentSetActivation: (DOMNode: HTMLElement) => void;
    daemonHandle: TDaemonReturn;
    [key: string]: any;
}): React.ReactElement<{
    ref: React.MutableRefObject<HTMLElement | null>;
    className: string;
}, string | React.JSXElementConstructor<any>>;
export declare function QuoteItem({ children, tagName, daemonHandle, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    tagName: string;
    isHeader: boolean;
    headerSyntax: string;
    daemonHandle: TDaemonReturn;
    [key: string]: any;
}): React.ReactElement<{
    className: string;
    ref: React.MutableRefObject<HTMLElement | null>;
    isHeader: boolean;
    headerSyntax: string;
}, string | React.JSXElementConstructor<any>>;
