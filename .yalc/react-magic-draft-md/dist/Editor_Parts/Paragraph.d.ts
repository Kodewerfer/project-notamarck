import React from "react";
import { TDaemonReturn } from "../hooks/useEditorDaemon";
export default function Paragraph({ children, tagName, isHeader, headerSyntax, daemonHandle, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    tagName: string;
    isHeader: boolean;
    headerSyntax: string;
    daemonHandle: TDaemonReturn;
    [key: string]: any;
}): React.DOMElement<React.DOMAttributes<HTMLElement>, HTMLElement>;
