import React from "react";
import { TDaemonReturn } from "../hooks/useEditorDaemon";
export declare function Blockquote({ children, tagName, parentSetActivation, daemonHandle, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    tagName: string;
    parentSetActivation: (DOMNode: HTMLElement) => void;
    daemonHandle: TDaemonReturn;
    [key: string]: any;
}): React.DOMElement<React.DOMAttributes<HTMLElement>, HTMLElement>;
export declare function QuoteItem({ children, tagName, daemonHandle, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    tagName: string;
    isHeader: boolean;
    headerSyntax: string;
    daemonHandle: TDaemonReturn;
    [key: string]: any;
}): React.DOMElement<React.DOMAttributes<HTMLElement>, HTMLElement>;
