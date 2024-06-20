import React from "react";
import { Compatible } from "unified/lib";
export declare function MD2HTML(MarkdownContent: Compatible): Promise<import("vfile").VFile>;
export declare function MD2HTMLSync(MarkdownContent: Compatible): import("vfile").VFile;
export declare function HTML2React(HTMLContent: Compatible, componentOptions?: Record<string, React.FunctionComponent<any>>): Promise<import("vfile").VFile & {
    result: JSX.Element;
}>;
export declare function HTML2ReactSnyc(HTMLContent: Compatible, componentOptions?: Record<string, React.FunctionComponent<any>>): import("vfile").VFile & {
    result: JSX.Element;
};
export declare function HTMLCleanUP(HTMLContent: Compatible, componentOptions?: Record<string, React.FunctionComponent<any>>): import("vfile").VFile;
export declare function HTML2MD(CurrentContent: Compatible): Promise<import("vfile").VFile>;
