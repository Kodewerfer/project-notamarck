import React from "react";
import { TDaemonReturn } from "../hooks/useEditorDaemon";
export default function PlainSyntax({ children, tagName, daemonHandle, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    tagName: string;
    daemonHandle: TDaemonReturn;
    [key: string]: any;
}): React.DOMElement<React.DOMAttributes<HTMLElement>, HTMLElement>;
