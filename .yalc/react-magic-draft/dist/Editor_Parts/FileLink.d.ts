import React from "react";
import { TDaemonReturn } from "../hooks/useEditorDaemon";
/**
 * A "Tag" link element is different in that it can be directly edited by the user once it is created.
 */
export default function FileLink({ children, tagName, daemonHandle, initCallback, removeCallback, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    tagName: string;
    initCallback?: (linkTarget: string) => void | Promise<void>;
    removeCallback?: (linkTarget: string) => void | Promise<void>;
    daemonHandle: TDaemonReturn;
    [key: string]: any;
}): React.ReactElement<{
    className: string;
    ref: React.MutableRefObject<HTMLElement | null>;
}, string | React.JSXElementConstructor<any>>;
export declare function getLastPartOfPath(fullPath: string): string;
