import React from "react";
import { TDaemonReturn } from "../hooks/useEditorDaemon";
export declare function ListContainer({ children, tagName, parentSetActivation, daemonHandle, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    tagName: string;
    parentSetActivation: (DOMNode: HTMLElement) => void;
    daemonHandle: TDaemonReturn;
    [key: string]: any;
}): React.ReactElement<{
    ref: React.MutableRefObject<HTMLElement | null>;
    className: string;
}, string | React.JSXElementConstructor<any>>;
export declare function ListItem({ children, tagName, daemonHandle, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    tagName: string;
    isHeader: boolean;
    headerSyntax: string;
    daemonHandle: TDaemonReturn;
    [key: string]: any;
}): import("react/jsx-runtime").JSX.Element;
