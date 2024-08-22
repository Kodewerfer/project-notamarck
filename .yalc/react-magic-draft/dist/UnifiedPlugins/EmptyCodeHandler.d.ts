/**
 * This is needed for a special quirk when converting triple backticks to pre element with unified.
 * the pre element doesn't need the closing part for it to be converted, thus if the triple backticks are surrounding a whitespace,
 * the ending triple backticks becomes the content of the code element within
 * this plugin manually correct it each time it happens
 */
declare function EmptyCodeTransformer(ast: object): void;
export declare const EmptyCodeHandler: () => typeof EmptyCodeTransformer;
export {};
