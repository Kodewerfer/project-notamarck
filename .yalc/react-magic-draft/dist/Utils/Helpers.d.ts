import React from "react";
/**
 * Processes a text node and converts it to HTML.
 *
 * @param {Node|string} textNode - The text node to be processed. Can be either a Node or a string.
 * @param ShouldRemoveWrapper =true - should remove the outer P tag if exist (converter quirk)
 *
 * @return {Node[]|null} - An array of new nodes created from the processed text node. Returns null if the converted HTML is empty or if the textNode parameter is not a text node.
 */
export declare function TextNodeProcessor(textNode: Node | string, ShouldRemoveWrapper?: boolean): Node[] | null | undefined;
/**
 * Render the child prop as string, in order to store it as a ref.
 * used in Paragraph component where there may be a React generated child.
 * @param children
 */
export declare function ExtraRealChild(children: React.ReactNode[] | React.ReactNode): string;
/**
 * Retrieves the HTML string representation of child nodes.
 *
 * @param {NodeListOf<ChildNode> | undefined} ChildNodes - The child nodes to be converted to HTML string.
 * @returns {string} - The HTML string representation of the child nodes.
 */
export declare function GetChildNodesAsHTMLString(ChildNodes: NodeListOf<ChildNode> | undefined): string;
/**
 * Returns the concatenated text content of the child nodes.
 *
 * @param {NodeListOf<ChildNode> | undefined} ChildNodes - The child nodes to extract the text content from.
 * @returns {string} The concatenated text content.
 */
export declare function GetChildNodesTextContent(ChildNodes: NodeListOf<ChildNode> | undefined): string;
/**
 * Check whether a node is the child of a container node
 *
 * @param {Node} Node - The node to start searching from.
 * @param {HTMLElement} Container - The container element to search within.
 * @param {RegExp} [NodeNameTest] - An optional regular expression to match against the node name.
 * @return {HTMLElement|null} - The found wrapping element if it exists, or null if not found.
 */
export declare function FindWrappingElementWithinContainer(Node: Node, Container: HTMLElement, NodeNameTest?: RegExp): HTMLElement | null;
/**
 * Retrieves an array of all the sibling nodes that appear after the given node.
 *
 * @param {Node} node - The node for which to find the next siblings.
 * @return {Node[]} - An array containing all the sibling nodes that appear after the given node.
 */
export declare function GetNextSiblings(node: Node): Node[];
/**
 * Returns an array of the non-line breaker real children of a given node or HTML element.
 *
 * @param {Node | HTMLElement} node - The node or HTML element whose real children need to be retrieved.
 * @return {Node[]} - An array containing the real children of the given node or HTML element.
 */
export declare function GetRealChildren(node: Node | HTMLElement): Node[];
/**
 * Retrieves the context of the caret within the current selection.
 *
 * @return {Object} - An object containing the current selection, the anchor node,
 *                   the remaining text from the caret position to the end of the node,
 *                   and the preceding text from the start of the node to the caret position.
 */
export declare function GetCaretContext(): {
    /**
     * Text content before the caret position
     */
    PrecedingText: string;
    /**
     * If the selection is extended, this will be the selected text content
     * otherwise it will be null.
     */
    SelectedText: string | null;
    /**
     * Text content after the caret position,
     * DOES NOT account for extended selection.
     */
    RemainingText: string;
    /**
     * Actual remaining text content after the current selection,
     * If the selection is not extended, it will be same as RemainingText,
     * If the selection IS extended, it will be the remaining text after the extended selection.
     * returns as null, if the selection extend beyond the starting text node,
     */
    TextAfterSelection: string | null;
    CurrentSelection: Selection | null;
    CurrentAnchorNode: any;
};
/**
 * Moves the caret to the specified target node at the given offset.
 * When used in Key handling functions, that key may require a second key-press to "work properly", making it seemingly less responsive
 * it is for this reason that this func is deprecated for now, saving for future reference.
 *
 * @param {Node | null | undefined} TargetNode - The target node to move the caret to.
 * @param {number} [Offset=0] - The offset within the target node to move the caret to. Default is 0.
 *
 * @returns {void}
 */
export declare function MoveCaretToNode(TargetNode: Node | null | undefined, Offset?: number): void;
/**
 * A Modified version of above function,Moves the caret into a specified node at a given offset.
 * Aimed to deal with the situation where caret is focused on a container node itself, instead of the actual elements within
 * Used primarily in dealing with editing bugs in del and backspace functionality.
 *
 * @param {Node | null | undefined} ContainerNode - The container node in which to move the caret.
 * @param {number} [Offset=0] - The offset at which to place the caret in the container node. Default is 0.
 *
 * @returns {void}
 */
export declare function MoveCaretIntoNode(ContainerNode: Node | null | undefined, Offset?: number): void;
/**
 * Creates a TreeWalker object for traversing elements and text nodes within a given root node.
 *
 * @param rootNode - The root node from which to start traversing.
 * @param targetNode - Optional. Directly cut to this node to start the traversal from.
 * @return The TreeWalker object that has been walked to the targetNode (if reachable).
 */
export declare function CreateTreeWalker(rootNode: Node | HTMLElement, targetNode?: Node | HTMLElement): TreeWalker;
/**
 * Retrieves the last text node within the given container node.
 *
 * @param {Node | HTMLElement} ContainerNode - The container node from which to search for the last text node.
 * @return {Node | null} - The last text node found or null if no text node is found.
 */
export declare function GetLastTextNode(ContainerNode: Node | HTMLElement): Node | null;
/**
 * Retrieves the first text node within a given container node.
 *
 * @param {Node | HTMLElement} ContainerNode - The container node to search within.
 * @return {Node | null} - The first text node found, or null if no text node is found.
 */
export declare function GetFirstTextNode(ContainerNode: Node | HTMLElement): Node | null;
export declare function GetAllSurroundingText(CurrentSelection: Selection, ContainerLimit?: Node | HTMLElement, HardLimit?: number): {
    precedingText: string;
    followingText: string;
};
