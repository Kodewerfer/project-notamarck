import React from "react";
import { Compatible } from "unified/lib";
export declare const MD2HTMLAsync: (MarkdownContent: Compatible) => Promise<import("vfile").VFile>;
export declare const MD2HTMLSync: (MarkdownContent: Compatible) => import("vfile").VFile;
export declare const HTML2ReactAsync: (HTMLContent: Compatible, componentOptions?: Record<string, React.FunctionComponent<any>>) => Promise<import("vfile").VFile & {
    result: JSX.Element;
}>;
export declare const HTML2ReactSync: (HTMLContent: Compatible, componentOptions?: Record<string, React.FunctionComponent<any>>) => import("vfile").VFile & {
    result: JSX.Element;
};
/**
 * Cleans up HTML content by removing unnecessary elements and attributes.
 *
 * @param {Compatible} HTMLContent - The HTML content to be cleaned up.
 * @param {Object} [componentOptions] - Optional component options.
 * @return {string} - The cleaned up HTML content.
 */
export declare function HTMLCleanUP(HTMLContent: Compatible, componentOptions?: Record<string, React.FunctionComponent<any>>): import("vfile").VFile;
export declare function HTML2MDSync(CurrentContent: Compatible, { keepBrs }: {
    keepBrs?: boolean;
}): Promise<import("vfile").VFile>;
