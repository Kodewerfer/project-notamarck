import React from "react";
import { TDaemonReturn } from "../hooks/useEditorDaemon";
/**
 *  In current implementation, the Link component is a special kind of "plainSyntax" component which are in-line elements in nature
 *  Many of the functionalities are the same, but since link have some specialities and may undergo changes, the code are kept seperated.
 * */
export default function Links({ children, tagName, daemonHandle, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    tagName: string;
    daemonHandle: TDaemonReturn;
    [key: string]: any;
}): React.DOMElement<React.DOMAttributes<HTMLElement>, HTMLElement>;
