import { TDaemonReturn } from "../../hooks/useEditorDaemon";
/**
 * Compiles all the text nodes within the specified container element.
 *
 * @param {HTMLElement} ContainerElement - The container element to search for text nodes.
 *
 * @returns {string} - The compiled text from all the found text nodes.
 */
export declare function CompileAllTextNode(ContainerElement: HTMLElement): string | null;
export declare function CompileDisplayTextNodes(ContainerElement: HTMLElement): string | null;
export declare function UpdateComponentAndSync(daemonHandle: TDaemonReturn, TextNodeContent: string | null | undefined, ParentElement: HTMLElement | Node | null): Promise<void> | undefined;
export declare function UpdateContainerAndSync(daemonHandle: TDaemonReturn, ContainerFullText: string | null | undefined, Container: HTMLElement | Node, ContainerTagName: string): Promise<void> | undefined;
