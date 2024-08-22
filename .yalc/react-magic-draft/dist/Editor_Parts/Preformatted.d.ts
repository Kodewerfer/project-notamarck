/**
 * These are preformatted block and its items, for in-line code, the editor simply reuse PlainSyntax component
 * for a code element to be a "CodeItem", it must be under a pre element and have the correct attrs
 */
import React from "react";
import { TDaemonReturn } from "../hooks/useEditorDaemon";
type TMoveCaretDirection = "pre" | "aft";
type TAddNewLineDirection = TMoveCaretDirection;
export declare function Preblock({ children, tagName, parentSetActivation, daemonHandle, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    tagName: string;
    parentSetActivation: (DOMNode: HTMLElement) => void;
    daemonHandle: TDaemonReturn;
    [key: string]: any;
}): React.ReactElement<{
    ref: React.MutableRefObject<HTMLElement | null>;
    className: string;
}, string | React.JSXElementConstructor<any>>;
export declare function CodeItem({ children, parentAddLine, parentMoveCaret, tagName, daemonHandle, ...otherProps }: {
    children?: React.ReactNode[] | React.ReactNode;
    parentMoveCaret: (direction: TMoveCaretDirection) => void;
    parentAddLine: (direction: TAddNewLineDirection) => void;
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
export {};
