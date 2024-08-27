import React from "react";
import { TDaemonReturn } from "../hooks/useEditorDaemon";
export default function PlainSyntax({ children, tagName, daemonHandle, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    tagName: string;
    daemonHandle: TDaemonReturn;
    [key: string]: any;
}): React.ReactElement<{
    className: string;
    ref: React.MutableRefObject<HTMLElement | null>;
}, string | React.JSXElementConstructor<any>>;
