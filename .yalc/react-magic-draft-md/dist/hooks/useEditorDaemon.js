/**
 *  This hook handles the backend heavy lifting
 *
 *  At its core, it monitors the changes made in the first ref(the watched ref), rolls them back, and performs the same operation on the second ref(the mirrored ref).
 *  The reason for this convoluted logic is that, for the best UX, I made the main editing area as an editable HTML element that handles rendering of MD as well as user-editing.
 *  it allowed editing and rendering on the fly, but it also means that the virtual DOM and the actual DOM are now out of sync.
 *  If I've simply turned the actual DOM back to React compos again, React will crash because it may need to remove elements that are no longer there, etc.
 *  So, the original DOM needs to be kept as-is; the changes will be made on the other DOM ref instead, which will later be turned to React components so that React can do proper diffing and DOM manipulation.
 */
import { useLayoutEffect, useState } from "react";
import _ from 'lodash';
import { CreateAndWalkToNode } from "../Utils/Helpers";
export const ParagraphTest = /^(p|div|main|body|h1|h2|h3|h4|h5|h6|blockquote|pre|code|ul|li|section|hr)$/i;
export default function useEditorDaemon(WatchElementRef, MirrorDocumentRef, FinalizeChanges, Options) {
    // Default options
    const DaemonOptions = Object.assign({ TextNodeCallback: undefined, OnRollback: undefined, ShouldObserve: true, ShouldLog: true, IsEditable: true, ParagraphTags: ParagraphTest, HistoryLength: 10 }, Options);
    // Persistent Variables
    // Easier to set up type and to init using state, but really acts as a ref.
    const DaemonState = useState(() => {
        const state = {
            EditorLocked: undefined,
            Observer: null,
            MutationQueue: [],
            IgnoreMap: new Map(),
            BindOperationMap: new Map(),
            AdditionalOperation: [],
            CaretOverrideTokens: [],
            UndoStack: null,
            RedoStack: null,
            SelectionStatusCache: null,
            SelectionStatusCachePreBlur: null,
        };
        if (typeof MutationObserver) {
            state.Observer = new MutationObserver((mutationList) => {
                state.MutationQueue.push(...mutationList);
            });
        }
        else {
            console.error("Critical Error: Mutation Observer cannot be initialized.");
        }
        return state;
    })[0];
    const ToggleObserve = (bObserver) => {
        if (!bObserver) {
            DaemonState.Observer.disconnect();
            DaemonState.MutationQueue.push(...DaemonState.Observer.takeRecords());
            return;
        }
        if (!WatchElementRef.current)
            return;
        return DaemonState.Observer.observe(WatchElementRef.current, {
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true,
        });
    };
    // Flush all changes in the MutationQueue
    const FlushAllRecords = () => {
        var _a;
        // OB's callback is asynchronous
        // make sure no records are left behind
        DaemonState.MutationQueue.push(...DaemonState.Observer.takeRecords());
        // console.log("Add:",...DaemonState.AdditionalOperation)
        // console.log("MQueue:",...DaemonState.MutationQueue)
        if (!DaemonState.MutationQueue.length && !DaemonState.AdditionalOperation.length) {
            // if (DaemonOptions.ShouldLog)
            //     console.log("MutationQueue and AdditionalOperation empty, sync aborted.");
            return;
        }
        let onRollbackCancelled; // the cleanup function, if present
        // Rollback mask
        if (!DaemonState.EditorLocked) {
            if (typeof DaemonOptions.OnRollback === 'function')
                onRollbackCancelled = DaemonOptions.OnRollback();
            DaemonState.EditorLocked = true;
            ToggleObserve(false);
            WatchElementRef.current.contentEditable = 'false';
        }
        let { OperationLogs, BindOperationLogs } = RollbackAndBuildOps();
        /**
         * The order of execution for the operations is:
         * 1. user initiated operations(on-page editing);
         * 2. "bind" operations, eg: those that are triggered by removing a syntax span
         * 3. "additional" operations, usually sent directly from a component
         */
        // Append Bind Ops
        OperationLogs.unshift(...BindOperationLogs); //DEPRECATED
        // Append Ops sent directly from components
        const newOperations = AppendAdditionalOperations(OperationLogs);
        DaemonState.AdditionalOperation = [];
        // Revert back to editing state when no operations are queued.
        // This can happen when all elements in the MutationQueue are ignored.
        if (newOperations.length === 0) {
            if (DaemonOptions.ShouldLog)
                console.log("No Operation generated, abort.");
            ToggleObserve(true);
            WatchElementRef.current.contentEditable = 'true';
            if (typeof onRollbackCancelled === "function")
                // Run the cleanup/revert function that is the return of the onRollbackReturn handler.
                // right now it's just unmasking.
                onRollbackCancelled();
            RestoreSelectionStatus(WatchElementRef.current, DaemonState.SelectionStatusCache);
            DaemonState.EditorLocked = false;
            return;
        }
        SaveMirrorToHistory();
        if (!SyncToMirror(newOperations))
            (_a = DaemonState.UndoStack) === null || _a === void 0 ? void 0 : _a.pop();
        // Reset ignore
        DaemonState.IgnoreMap.clear();
        // Notify parent
        FinalizeChanges();
    };
    const RollbackAndBuildOps = () => {
        // Rollback Changes
        let mutation;
        let lastMutation = null;
        let OperationLogs = [];
        let BindOperationLogs = [];
        while ((mutation = DaemonState.MutationQueue.pop())) {
            /**
             * Text Changed
             */
            if (mutation.type === "characterData" && mutation.oldValue !== null) {
                // only use the latest character data mutation.
                if (lastMutation && mutation.target === lastMutation.target)
                    continue;
                // Check for ignore
                if (DaemonState.IgnoreMap.get(mutation.target) === 'text' || DaemonState.IgnoreMap.get(mutation.target) === 'any')
                    continue;
                // Since text node is usually under a parent, check for the parent for ignore as well
                let textParent = mutation.target.parentNode;
                if (textParent && (DaemonState.IgnoreMap.get(textParent) === 'text' || DaemonState.IgnoreMap.get(textParent) === 'any'))
                    continue;
                // Get the original value for the text node. used in undo
                let TextNodeOriginalValue = mutation.oldValue;
                if (DaemonState.MutationQueue.length >= 1) {
                    DaemonState.MutationQueue.slice().reverse().some((mutationData) => {
                        if (mutationData.target === (mutation === null || mutation === void 0 ? void 0 : mutation.target) && mutationData.oldValue !== null) {
                            TextNodeOriginalValue = mutationData.oldValue;
                        }
                        else {
                            return TextNodeOriginalValue;
                        }
                    });
                }
                // TextNodeCallback present, use TextNodeCallback result
                if (typeof DaemonOptions.TextNodeCallback === 'function') {
                    const ParentNode = mutation.target.parentNode;
                    const OldTextNode = mutation.target;
                    const callbackResult = DaemonOptions.TextNodeCallback(OldTextNode);
                    if (!callbackResult || !callbackResult.length) {
                        // exception
                        if (OldTextNode.textContent !== '')
                            console.warn("Invalid text node handler return", callbackResult, " From ", OldTextNode.textContent);
                        //
                        if (OldTextNode.textContent === '' && (mutation.oldValue || TextNodeOriginalValue)) {
                            console.log("Text Handler: Result is empty,delete text node");
                            const operationLog = {
                                type: "REMOVE",
                                newNode: OldTextNode.cloneNode(true),
                                targetNodeXP: GetXPathFromNode(OldTextNode),
                                parentXP: GetXPathFromNode(ParentNode),
                                siblingXP: mutation.nextSibling ? GetXPathFromNode(mutation.nextSibling) : null
                            };
                            OperationLogs.push(operationLog);
                        }
                        lastMutation = mutation;
                        continue;
                    }
                    // if (DaemonOptions.ShouldLog)
                    //     console.log("Text Handler result:", callbackResult, "from text value:", OldTextNode.textContent);
                    // The scope of operation
                    const ParentXPath = ParentNode ? GetXPathFromNode(ParentNode) : '';
                    const parentClosestParagraph = FindNearestParagraph(ParentNode, DaemonOptions.ParagraphTags, WatchElementRef.current);
                    const parentClosestParagraphXPath = parentClosestParagraph ? GetXPathFromNode(parentClosestParagraph) : '';
                    // const parentClosestParagraphXPath = ParentNode.parentNode ? GetXPathFromNode(ParentNode.parentNode) : '';
                    // Determined if parent of the text is paragraph level (p/div etc.) then choose candidate, !! may be overwritten later.
                    const ParentTagsTest = DaemonOptions.ParagraphTags;
                    let LogParentXP = ParentXPath;
                    let whiteSpaceStart = OldTextNode.textContent.match(/^\s*/) || [""];
                    let whiteSpaceEnd = OldTextNode.textContent.match(/\s*$/) || [""];
                    //Result in only one text node
                    if (callbackResult.length === 1 && callbackResult[0].nodeType === Node.TEXT_NODE && callbackResult[0].textContent !== null) {
                        const RestoredText = whiteSpaceStart[0] + callbackResult[0].textContent.trim() + whiteSpaceEnd[0];
                        OperationLogs.push({
                            type: "TEXT",
                            fromTextHandler: true,
                            targetNodeXP: GetXPathFromNode(mutation.target),
                            nodeText: RestoredText,
                            nodeTextOld: TextNodeOriginalValue
                        });
                        // Cache the last
                        lastMutation = mutation;
                        continue;
                    }
                    //Result in multiple nodes or only one node but no longer a text node.
                    let LogNodeXP = GetXPathNthChild(OldTextNode);
                    let logSiblingXP = OldTextNode.nextSibling ? GetXPathFromNode(OldTextNode.nextSibling) : null;
                    // at this point, the text node can either be under a sub-level element(strong,del etc) or a paragraph-level tag
                    // if it was the former case, override; otherwise, leave the nodes where they're (unless they themselves have a paragraph-level tag)
                    LogParentXP = DaemonOptions.ParagraphTags.test(ParentNode.tagName.toLowerCase()) ? ParentXPath : parentClosestParagraphXPath;
                    // Add the new node/nodes in a doc frag.It's "toReversed()", because the later operation uses pop()
                    // Also check if contains any paragraph level tags.
                    const NewFragment = document.createDocumentFragment();
                    let shouldOverrideParent = false; //flag, true if resulting nodes have at least one paragraph-level tag
                    callbackResult.toReversed().forEach((node, index, array) => {
                        // Check to set the flag
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const tagName = node.tagName.toLowerCase();
                            if (ParentTagsTest.test(tagName))
                                shouldOverrideParent = true;
                        }
                        // Add trailing whitespace
                        if (index === 0) {
                            // the last element,because it is flipped,
                            if (node.textContent && node.nodeType === Node.TEXT_NODE) {
                                node.textContent = node.textContent.trim() + whiteSpaceEnd[0];
                            }
                        }
                        // Add starting whitespace
                        if (index === array.length - 1) {
                            // the first element,because it is flipped,
                            if (node.textContent && node.nodeType === Node.TEXT_NODE) {
                                node.textContent = whiteSpaceStart[0] + node.textContent.trim();
                            }
                        }
                        // if there is a non text node in between, add whitespace to surrounding textnodes.
                        if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent !== ' ') {
                            if (!node.textContent.endsWith(' ') && array[index - 1] && array[index - 1].nodeType !== Node.TEXT_NODE) {
                                node.textContent = node.textContent.trimEnd() + ' ';
                            }
                            if (!node.textContent.startsWith(' ') && array[index + 1] && array[index + 1].nodeType !== Node.TEXT_NODE) {
                                node.textContent = ' ' + node.textContent.trimStart();
                            }
                        }
                        // Frag to make sure elements are in correct order
                        NewFragment.prepend(node);
                    });
                    // ! Scope override
                    if (shouldOverrideParent)
                        LogParentXP = parentClosestParagraphXPath;
                    if (LogParentXP === parentClosestParagraphXPath) {
                        LogNodeXP = GetXPathNthChild(ParentNode);
                        logSiblingXP = ParentNode.nextSibling ? GetXPathNthChild(ParentNode.nextSibling) : null;
                    }
                    // remove the old node, later operation uses pop(), so this happens last.
                    OperationLogs.push({
                        type: "REMOVE",
                        fromTextHandler: true,
                        targetNodeXP: LogNodeXP,
                        parentXP: LogParentXP,
                        siblingXP: logSiblingXP
                    });
                    OperationLogs.push({
                        type: "ADD",
                        fromTextHandler: true,
                        newNode: NewFragment.cloneNode(true),
                        targetNodeXP: LogNodeXP,
                        parentXP: LogParentXP,
                        siblingXP: logSiblingXP,
                    });
                    // Cache the last, early continue
                    lastMutation = mutation;
                    continue;
                }
                /** Default handling, change text content only */
                const Operation = {
                    type: "TEXT",
                    targetNodeXP: GetXPathFromNode(mutation.target),
                    nodeText: mutation.target.textContent,
                    nodeTextOld: TextNodeOriginalValue
                };
                OperationLogs.push(Operation);
            }
            /**
             * Removed
             */
            if (mutation.removedNodes && mutation.removedNodes.length) {
                for (let i = mutation.removedNodes.length - 1; i >= 0; i--) {
                    let removedNode = mutation.removedNodes[i];
                    // Check if the element had bind operations
                    HandleBindOperations(removedNode, 'remove', BindOperationLogs);
                    // Check Ignore map
                    if (DaemonState.IgnoreMap.get(removedNode) === 'remove' || DaemonState.IgnoreMap.get(removedNode) === 'any')
                        continue;
                    // rollback
                    mutation.target.insertBefore(removedNode, mutation.nextSibling);
                    const operationLog = {
                        type: "REMOVE",
                        newNode: removedNode.cloneNode(true),
                        targetNodeXP: GetXPathFromNode(removedNode),
                        parentXP: GetXPathFromNode(mutation.target),
                        siblingXP: mutation.nextSibling ? GetXPathFromNode(mutation.nextSibling) : null
                    };
                    OperationLogs.push(operationLog);
                }
            }
            /**
             * Added
             */
            if (mutation.addedNodes && mutation.addedNodes.length) {
                for (let i = mutation.addedNodes.length - 1; i >= 0; i--) {
                    const addedNode = mutation.addedNodes[i];
                    // Check if the element had bind operations
                    HandleBindOperations(addedNode, 'add', BindOperationLogs);
                    // Check Ignore map
                    if (DaemonState.IgnoreMap.get(addedNode) === 'add' || DaemonState.IgnoreMap.get(addedNode) === 'any')
                        continue;
                    // since the added element will always be new, check if the container is in IgnoreMap
                    if (DaemonState.IgnoreMap.get(mutation.target) === 'add' || DaemonState.IgnoreMap.get(mutation.target) === 'any')
                        continue;
                    // rollback
                    if (addedNode.parentNode) {
                        mutation.target.removeChild(addedNode);
                    }
                    const addedNodeXP = GetXPathFromNode(addedNode);
                    const operationLog = {
                        type: "ADD",
                        newNode: addedNode.cloneNode(true), //MUST be a deep clone, otherwise when breaking a new line, the text node content of a sub node will be lost.
                        targetNodeXP: addedNodeXP,
                        parentXP: GetXPathFromNode(mutation.target),
                        siblingXP: mutation.nextSibling ? GetXPathFromNode(mutation.nextSibling) : null
                    };
                    OperationLogs.push(operationLog);
                }
            }
            // Cache the last
            lastMutation = mutation;
        }
        return { OperationLogs, BindOperationLogs };
    };
    //DEPRECATED
    const HandleBindOperations = (Node, BindTrigger, LogStack) => {
        const OperationItem = DaemonState.BindOperationMap.get(Node);
        if (OperationItem && (OperationItem.Trigger === BindTrigger || OperationItem.Trigger === 'any')) {
            const AdditionalOperations = BuildOperations(OperationItem.Operations);
            LogStack.push(...AdditionalOperations);
        }
    };
    const AppendAdditionalOperations = (OperationLogs) => {
        if (!DaemonState.AdditionalOperation.length)
            return OperationLogs;
        const syncOpsBuilt = BuildOperations(DaemonState.AdditionalOperation, true);
        OperationLogs.unshift(...syncOpsBuilt.reverse());
        return OperationLogs;
    };
    const SaveMirrorToHistory = () => {
        if (!MirrorDocumentRef || !MirrorDocumentRef.current) {
            return;
        }
        const HistoryLength = DaemonOptions.HistoryLength;
        const CurrentDoc = (MirrorDocumentRef.current.cloneNode(true));
        if (DaemonState.UndoStack === null)
            DaemonState.UndoStack = [CurrentDoc];
        else
            DaemonState.UndoStack.push(CurrentDoc);
        // Save up to ten history logs
        if (DaemonState.UndoStack.length > HistoryLength)
            DaemonState.UndoStack.shift();
    };
    // Use content from Undo stack to override the page, save it to Redo Stack
    const UndoAndSync = () => {
        var _a;
        // FIXME: expensive operation, but to revert the OpLogs brings too many problems
        console.log("Undo, stack length:", (_a = DaemonState.UndoStack) === null || _a === void 0 ? void 0 : _a.length);
        if (!DaemonState.UndoStack || !DaemonState.UndoStack.length || !MirrorDocumentRef.current)
            return;
        const previousDocument = DaemonState.UndoStack.pop();
        if (!previousDocument || !previousDocument.documentElement) {
            console.warn("History object is invalid: ", previousDocument);
            return;
        }
        const CurrentDoc = (MirrorDocumentRef.current.cloneNode(true));
        // Save to redo
        if (DaemonState.RedoStack === null)
            DaemonState.RedoStack = [CurrentDoc];
        else
            DaemonState.RedoStack.push(CurrentDoc);
        if (DaemonState.RedoStack.length > 10)
            DaemonState.RedoStack.shift();
        MirrorDocumentRef.current = previousDocument;
        FinalizeChanges();
    };
    const RedoAndSync = () => {
        var _a;
        console.log("Redo, stack length:", (_a = DaemonState.RedoStack) === null || _a === void 0 ? void 0 : _a.length);
        DaemonState.MutationQueue = [];
        if (!DaemonState.RedoStack || !DaemonState.RedoStack.length || !MirrorDocumentRef.current)
            return;
        // save to history again
        SaveMirrorToHistory();
        MirrorDocumentRef.current = DaemonState.RedoStack.pop();
        FinalizeChanges();
    };
    // Helper to get the precise location in the original DOM tree, ignore generated tags(flag)
    function GetXPathFromNode(node, bFilterGenerated = true) {
        if (!WatchElementRef.current || !node)
            return '';
        let parent = node.parentNode;
        if (!parent)
            return ''; // If no parent found, very unlikely
        // XPath upper limit: any element with an ID
        if (node.id && node.id !== '') {
            return '//*[@id="' + node.id + '"]';
        }
        // XPath upper limit: The watched element.
        if (node.className === WatchElementRef.current.className && node.tagName === WatchElementRef.current.tagName) {
            return '//body';
        }
        // text nodes
        if (node.nodeType === Node.TEXT_NODE) {
            // For text nodes, count previous sibling text nodes for accurate XPath generation
            let textNodeIndex = 1;
            let sibling = node.previousSibling;
            // Counting preceding sibling Text nodes
            while (sibling) {
                if (sibling.nodeType === Node.TEXT_NODE) {
                    textNodeIndex++;
                }
                sibling = sibling.previousSibling;
            }
            if (parent) {
                return GetXPathFromNode(parent) + '/text()' + `[${textNodeIndex}]`;
            }
            else {
                return 'text()' + `[${textNodeIndex}]`;
            }
        }
        // For Non-text nodes
        let nodeCount = 0;
        for (let i = 0; i < parent.childNodes.length; i++) {
            let sibling = parent.childNodes[i];
            if (sibling === node) {
                // Recurse on the parent node, then append this node's details to form an XPath string
                return GetXPathFromNode(parent) + '/' + node.nodeName.toLowerCase() + '[' + (nodeCount + 1) + ']';
            }
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === node.nodeName && !sibling.hasAttribute('data-is-generated'))
                nodeCount++;
            if (!bFilterGenerated && sibling.nodeName === node.nodeName)
                nodeCount++;
        }
        return '';
    }
    // A different method of getting xp, non-recursion
    // This is the "approximate" location of the note, the undo function can then "delete on this location"
    // Mainly used in give Xpath to the would be added nodes
    function GetXPathNthChild(node, bFilterGenerated = true) {
        if (!node)
            return '';
        let xpSegments = [];
        while (node && node !== document.body) {
            // the most identifiable, no need to run more logic
            if (node.id && node.id !== '') {
                xpSegments.push('/*[@id="' + node.id + '"]');
                break;
            }
            // Node is the container itself
            if (WatchElementRef.current && node.className === WatchElementRef.current.className && node.tagName === WatchElementRef.current.tagName) {
                xpSegments.push('/body');
                break;
            }
            let parent = node.parentNode;
            if (!parent)
                break;
            let nodeCount = 0;
            // start checking prev child nodes against the current node
            for (let i = 0; i < parent.childNodes.length; i++) {
                let sibling = parent.childNodes[i];
                if (sibling === node) {
                    xpSegments.push('node()[' + (nodeCount + 1) + ']');
                    break;
                }
                // If the sibling is a relevant node (either not generated or text node), its count is increased.
                if (!bFilterGenerated
                    || sibling.nodeType === Node.TEXT_NODE
                    || (sibling.nodeType === Node.ELEMENT_NODE && !sibling.hasAttribute('data-is-generated')))
                    nodeCount++;
            }
            // Move up the tree to the next parent node.
            node = parent;
        }
        // new path were pushed in, need to reverse them to be correct.
        return '/' + xpSegments.reverse().join('/');
    }
    function BuildOperations(Operations, bAddOps) {
        let OPStack;
        if (Array.isArray(Operations)) {
            OPStack = [...Operations];
        }
        else {
            OPStack = [Operations];
        }
        for (const OPItem of OPStack) {
            if (bAddOps) {
                Object.assign(OPItem, {
                    IsAdditional: true
                });
            }
            if (!OPItem.targetNodeXP && OPItem.targetNode) {
                const targetNode = typeof OPItem.targetNode === "function" ? OPItem.targetNode() : OPItem.targetNode;
                Object.assign(OPItem, {
                    targetNodeXP: GetXPathFromNode(targetNode)
                });
            }
            // adding
            if (!OPItem.parentXP && OPItem.parentNode) {
                const parentNode = typeof OPItem.parentNode === "function" ? OPItem.parentNode() : OPItem.parentNode;
                Object.assign(OPItem, {
                    parentXP: GetXPathFromNode(parentNode)
                });
            }
            // remove,replace
            if (!OPItem.parentXP && OPItem.targetNode && OPItem.targetNode instanceof Node && OPItem.targetNode.parentNode) {
                Object.assign(OPItem, {
                    parentXP: GetXPathFromNode(OPItem.targetNode.parentNode)
                });
            }
            if (!OPItem.siblingXP && OPItem.siblingNode !== undefined) {
                Object.assign(OPItem, {
                    siblingXP: OPItem.siblingNode ? GetXPathFromNode(OPItem.siblingNode) : null // if not undefined, then there isn't a sibling node
                });
            }
            else if (!OPItem.siblingXP && OPItem.targetNode && OPItem.targetNode instanceof Node) {
                Object.assign(OPItem, {
                    siblingXP: OPItem.targetNode.nextSibling ? GetXPathFromNode(OPItem.targetNode.nextSibling) : null
                });
            }
        }
        return OPStack;
    }
    // Sync to the mirror document, middleman function
    const SyncToMirror = (Operations) => {
        var _a;
        if (!Operations.length)
            return false;
        let operation;
        while ((operation = Operations.pop())) {
            const { type, newNode, targetNodeXP, nodeText, parentXP, siblingXP, attribute } = operation;
            if (DaemonOptions.ShouldLog)
                console.log("OP Log:", operation);
            try {
                // switch (type):
                if (type === "TEXT") {
                    UpdateMirrorDocument.Text(targetNodeXP, nodeText);
                }
                if (type === "REMOVE") {
                    UpdateMirrorDocument.Remove(parentXP, targetNodeXP);
                }
                if (type === "ADD") {
                    UpdateMirrorDocument.Add(parentXP, newNode, siblingXP);
                }
                if (type === "REPLACE") {
                    UpdateMirrorDocument.Replace(targetNodeXP, newNode);
                }
                if (type === "ATTR") {
                    UpdateMirrorDocument.Attribute(targetNodeXP, attribute);
                }
            }
            catch (e) {
                console.error("Error When Syncing:", e);
                return false;
            }
        }
        (_a = MirrorDocumentRef.current) === null || _a === void 0 ? void 0 : _a.normalize();
        return true;
    };
    const UpdateMirrorDocument = {
        'Text': (NodeXpath, Text) => {
            if (!NodeXpath) {
                console.warn("UpdateMirrorDocument.Text: Invalid Parameter");
                return;
            }
            const targetNode = GetNodeFromXPathInDoc(MirrorDocumentRef.current, NodeXpath);
            if (!targetNode || targetNode.nodeType !== Node.TEXT_NODE) {
                console.warn("UpdateMirrorDocument.Text: invalid target text node");
                return;
            }
            if (!Text)
                Text = "";
            targetNode.nodeValue = Text;
        },
        'Remove': (XPathParent, XPathSelf) => {
            if (!XPathParent || !XPathSelf) {
                console.warn("UpdateMirrorDocument.Remove: Invalid Parameter");
                return;
            }
            const parentNode = GetNodeFromXPathInDoc(MirrorDocumentRef.current, XPathParent);
            if (!parentNode) {
                console.warn("UpdateMirrorDocument.Remove: No parentNode");
                return;
            }
            const regexp = /\/node\(\)\[\d+]$/;
            if (regexp.test(XPathParent) && DaemonOptions.ShouldLog)
                console.log("Fuzzy REMOVE node Parent:", parentNode);
            const targetNode = GetNodeFromXPathInDoc(MirrorDocumentRef.current, XPathSelf);
            if (!targetNode) {
                console.warn("UpdateMirrorDocument.Remove: Cannot find targetNode");
                return;
            }
            if (regexp.test(XPathSelf) && DaemonOptions.ShouldLog)
                console.log("Fuzzy REMOVE node target:", targetNode);
            parentNode.removeChild(targetNode);
        },
        'Add': (XPathParent, NewNode, XPathSibling) => {
            if (!XPathParent || !NewNode) {
                console.warn("UpdateMirrorDocument.Add: Invalid Parameter");
                return;
            }
            const parentNode = GetNodeFromXPathInDoc(MirrorDocumentRef.current, XPathParent);
            if (!parentNode)
                throw "UpdateMirrorDocument.Add: No parentNode";
            const regexp = /\/node\(\)\[\d+]$/;
            if (regexp.test(XPathParent) && DaemonOptions.ShouldLog)
                console.log("Fuzzy ADD node Parent:", parentNode);
            let targetNode = (typeof NewNode === 'function') ? NewNode() : NewNode;
            if (!targetNode) {
                console.warn("UpdateMirrorDocument.Add: No targetNode");
                return;
            }
            let SiblingNode = null;
            if (XPathSibling) {
                SiblingNode = GetNodeFromXPathInDoc(MirrorDocumentRef.current, XPathSibling);
                if (!SiblingNode) {
                    SiblingNode = null;
                }
            }
            if (XPathSibling !== null && regexp.test(XPathSibling) && DaemonOptions.ShouldLog)
                console.log("Fuzzy ADD node Sibling:", SiblingNode);
            if (SiblingNode === null && XPathSibling)
                console.warn("Adding Operation: Sibling should not have been null, but got null result anyways: ", XPathSibling);
            parentNode.insertBefore(targetNode, SiblingNode);
        },
        'Replace': (NodeXpath, NewNode) => {
            if (!NodeXpath || !NewNode) {
                console.warn('UpdateMirrorDocument.Replace Invalid Parameter');
                return;
            }
            const targetNode = GetNodeFromXPathInDoc(MirrorDocumentRef.current, NodeXpath);
            if (!targetNode) {
                console.warn('UpdateMirrorDocument.Replace No TargetNode');
                return;
            }
            const ReplacementNode = (typeof NewNode === 'function') ? NewNode() : NewNode;
            targetNode.replaceWith(ReplacementNode);
        },
        'Attribute': (NodeXpath, NewAttribute) => {
            if (!NodeXpath || !NewAttribute.name || !NewAttribute.value) {
                console.warn('UpdateMirrorDocument.Attribute Invalid Parameter');
                return;
            }
            const targetNode = GetNodeFromXPathInDoc(MirrorDocumentRef.current, NodeXpath);
            if (!targetNode) {
                console.warn('UpdateMirrorDocument.Replace No TargetNode');
                return;
            }
            targetNode.setAttribute(NewAttribute.name, NewAttribute.value);
        },
    };
    function GetSelectionStatus() {
        const CurrentSelection = window.getSelection();
        if (!CurrentSelection || !CurrentSelection.anchorNode)
            return null;
        let CurrentRange = CurrentSelection.getRangeAt(0);
        if (!CurrentRange)
            return null;
        const AnchorNodeXPath = GetXPathNthChild(CurrentSelection.anchorNode, false);
        const AnchorNodeXPathConcise = GetXPathFromNode(CurrentSelection.anchorNode, false);
        const SelectionExtent = CurrentSelection.isCollapsed ? 0 : CurrentSelection.toString().length;
        // conflicting info, likely due to rendering
        if (!CurrentSelection.isCollapsed && !SelectionExtent)
            return null;
        return {
            AnchorNodeXPath,
            AnchorNodeXPathConcise,
            StartingOffset: CurrentRange.startOffset,
            SelectionExtent,
        };
    }
    function RestoreSelectionStatus(RootElement, SavedState) {
        const CurrentSelection = window.getSelection();
        if (!CurrentSelection || !SavedState || SavedState.AnchorNodeXPathConcise === '//body')
            return;
        if (DaemonOptions.ShouldLog)
            console.log("Restoring selection status: ", SavedState);
        let XPathSegments = ParseXPath(SavedState.AnchorNodeXPath);
        const reconstructXPath = () => {
            return XPathSegments.map(item => item.index ? `${item.nodePath}[${item.index}]` : `${item.nodePath}`).join('/');
        };
        const getLastElementNeighbors = () => {
            const LastEleIndex = (idx, adjustment) => idx ? idx + adjustment : idx;
            const GenerateSiblingXP = (adjustment) => [...XPathSegments].map((item, index) => {
                const ItemIndex = index === XPathSegments.length - 1
                    ? LastEleIndex(item.index, adjustment)
                    : item.index;
                return item.index ? `${item.nodePath}[${ItemIndex}]` : `${item.nodePath}`;
            }).join('/');
            return [GenerateSiblingXP(-1), GenerateSiblingXP(1)];
        };
        let AnchorNode = null;
        let bOriginalNodeFound = true;
        // Try to find the original anchor, or its sibling or parent's sibling
        while (!AnchorNode && XPathSegments.length) {
            const XPathReconstructed = reconstructXPath();
            AnchorNode = GetNodeFromXPathInHTMLElement(WatchElementRef.current, XPathReconstructed);
            if (AnchorNode) {
                if (DaemonOptions.ShouldLog)
                    console.log("AnchorNode Found on:", {
                        XPathReconstructed: XPathReconstructed,
                        AnchorNodeXPathConcise: GetXPathFromNode(AnchorNode)
                    });
                break;
            }
            if (bOriginalNodeFound)
                bOriginalNodeFound = false;
            // Try neighbors
            let [PrevSiblingXP, NextSiblingXP] = getLastElementNeighbors();
            // console.log(PrevSiblingXP, " and ", NextSiblingXP);
            // the next sibling(that which caret will naturally land on) takes priority.
            AnchorNode = GetNodeFromXPathInHTMLElement(WatchElementRef.current, NextSiblingXP) || GetNodeFromXPathInHTMLElement(WatchElementRef.current, PrevSiblingXP);
            if (AnchorNode)
                break;
            // Still nothing, Try the parent level
            XPathSegments.pop();
        }
        if (!AnchorNode)
            return; //at this stage, very unlikely
        // Get a walker that is walked to the anchor node to facilitate the following operations
        const NodeWalker = CreateAndWalkToNode(RootElement, AnchorNode);
        // Ensure that the caret will land on an editable node
        while (AnchorNode.contentEditable === 'false' || (AnchorNode.parentNode && AnchorNode.parentNode.contentEditable === 'false')) {
            AnchorNode = NodeWalker.nextNode();
            if (!AnchorNode) {
                AnchorNode = NodeWalker.previousNode();
                break;
            }
        }
        if (!AnchorNode)
            return;
        // Deal with expended selection
        let FocusNode = AnchorNode;
        let EndOffset = 0;
        if (bOriginalNodeFound && AnchorNode.textContent && SavedState.SelectionExtent) {
            const remainingLength = SavedState.SelectionExtent - (AnchorNode.textContent.length - SavedState.StartingOffset);
            let pastLength = 0;
            // Selection ends outside of the anchor node
            while (remainingLength > 0 && (FocusNode = NodeWalker.nextNode()) != null) {
                if (FocusNode.nodeType !== Node.TEXT_NODE || !FocusNode.textContent)
                    continue;
                if (FocusNode.parentNode && FocusNode.parentNode.contentEditable === 'false')
                    continue;
                pastLength += FocusNode.textContent.length;
                let lengthDifference = remainingLength - pastLength;
                if (lengthDifference <= 0) {
                    EndOffset = FocusNode.textContent.length + lengthDifference;
                    break;
                }
            }
            // selection ended inside the anchor node
            if (remainingLength <= 0) {
                EndOffset = SavedState.SelectionExtent + SavedState.StartingOffset;
            }
        }
        // reconstruct the range
        const NewRange = document.createRange();
        let StartingOffset = bOriginalNodeFound ? SavedState.StartingOffset : 0;
        // Override if need be
        /**
         * NOTE: after enter is pressed to break lines, the caret will start on the end of the first line where the line was cut off,
         *       this works regardless if it was an expanded selection. But on expanded selection, the selection will extend to the new line and may cause problems especially with tokens
         */
        const OverrideToken = DaemonState.CaretOverrideTokens;
        const PreTokenAnchor = AnchorNode;
        const PreTokenStartingOffset = StartingOffset;
        const PreTokenFocusNode = FocusNode;
        const PreTokenEndOffset = EndOffset;
        if (OverrideToken.length) {
            ({
                AnchorNode, StartingOffset, FocusNode, EndOffset
            }
                = HandleSelectionToken(OverrideToken, NodeWalker, {
                    CurrentAnchorNode: AnchorNode,
                    CurrentStartingOffset: StartingOffset,
                    CurrentEndOffset: EndOffset,
                    CurrentFocusNode: FocusNode
                }));
            if (DaemonOptions.ShouldLog)
                console.log("Caret after Token: ", {
                    AnchorNode: GetXPathFromNode(AnchorNode),
                    StartingOffset: StartingOffset,
                    FocusNode: FocusNode ? GetXPathFromNode(FocusNode) : "",
                    EndOffset: EndOffset
                });
        }
        if (!AnchorNode) {
            AnchorNode = PreTokenAnchor;
            StartingOffset = PreTokenStartingOffset;
            FocusNode = PreTokenFocusNode;
            EndOffset = PreTokenEndOffset;
        }
        if (AnchorNode.textContent && AnchorNode.textContent.length < StartingOffset)
            StartingOffset = AnchorNode.textContent.length;
        try {
            NewRange.setStart(AnchorNode, StartingOffset);
            NewRange.collapse(true);
        }
        catch (e) {
            console.warn("StartingOffset error");
            NewRange.setStart(AnchorNode, 0);
        }
        try {
            if (FocusNode && SavedState.SelectionExtent > 0) {
                NewRange.collapse(false);
                NewRange.setEnd(FocusNode, EndOffset || 0);
            }
            CurrentSelection.removeAllRanges();
            CurrentSelection.addRange(NewRange);
        }
        catch (e) {
            console.warn("EndOffset error");
        }
    }
    function HandleSelectionToken(OverrideTokens, Walker, RangeInformation) {
        let AnchorNode = RangeInformation.CurrentAnchorNode;
        let StartingOffset = RangeInformation.CurrentStartingOffset;
        let FocusNode = RangeInformation.CurrentFocusNode;
        let EndOffset = RangeInformation.CurrentEndOffset;
        if (DaemonOptions.ShouldLog)
            console.log("Overriding Caret, Token: ", ...OverrideTokens);
        OverrideTokens.forEach((TokenString) => {
            switch (TokenString) {
                case 'zero': {
                    StartingOffset = 0;
                    FocusNode = null;
                    break;
                }
                case 'PrevLine': {
                    while (AnchorNode = Walker.previousNode()) {
                        if (AnchorNode.parentNode !== WatchElementRef.current)
                            continue;
                        if (CheckForAncestor(RangeInformation.CurrentAnchorNode, AnchorNode))
                            continue;
                        if (!AnchorNode.parentNode)
                            continue;
                        if (AnchorNode.textContent === "\n")
                            continue;
                        if (AnchorNode.parentNode.contentEditable === 'false')
                            continue;
                        FocusNode = null;
                        StartingOffset = 0;
                        break;
                    }
                    break;
                }
                case 'NextLine': {
                    while (AnchorNode = Walker.nextNode()) {
                        if (!AnchorNode.parentNode)
                            continue;
                        if (AnchorNode.textContent === "\n")
                            continue;
                        if (AnchorNode.parentNode !== WatchElementRef.current)
                            continue;
                        if (AnchorNode.parentNode.contentEditable === 'false')
                            continue;
                        FocusNode = null;
                        StartingOffset = 0;
                        break;
                    }
                    break;
                }
                case 'NextEditable': {
                    while (AnchorNode = Walker.nextNode()) {
                        if (AnchorNode.nodeType !== Node.TEXT_NODE)
                            continue;
                        if (AnchorNode.textContent === "\n")
                            continue;
                        if (AnchorNode.parentNode && AnchorNode.parentNode.contentEditable === 'false')
                            continue;
                        FocusNode = null;
                        StartingOffset = 0;
                        break;
                    }
                    break;
                }
                case 'NextElement': {
                    // Same as NextEditable but filter out generated elements
                    while (AnchorNode = Walker.nextNode()) {
                        if (CheckForAncestor(AnchorNode, RangeInformation.CurrentAnchorNode))
                            continue;
                        // if (AnchorNode.nodeType !== Node.TEXT_NODE) continue;
                        if (AnchorNode.textContent === "\n")
                            continue;
                        if (AnchorNode.parentNode && AnchorNode.parentNode.contentEditable === 'false')
                            continue;
                        if (AnchorNode.parentNode && AnchorNode.parentNode.hasAttribute("data-is-generated"))
                            continue;
                        FocusNode = null;
                        StartingOffset = 0;
                        break;
                    }
                    break;
                }
                case 'PrevElement': {
                    //first walk the to the container element
                    while (AnchorNode = Walker.previousNode()) {
                        if (AnchorNode.parentNode && DaemonOptions.ParagraphTags.test(AnchorNode.parentNode.nodeName.toLowerCase()))
                            break;
                    }
                    console.log("started:", AnchorNode);
                    while (AnchorNode = Walker.previousNode()) {
                        console.log("past:", AnchorNode);
                        // if (AnchorNode.nodeType !== Node.TEXT_NODE) continue;
                        if (AnchorNode.textContent === "\n")
                            continue;
                        if (AnchorNode.parentNode && AnchorNode.parentNode.contentEditable === 'false')
                            continue;
                        if (AnchorNode.parentNode && AnchorNode.parentNode.hasAttribute("data-is-generated"))
                            continue;
                        FocusNode = null;
                        StartingOffset = AnchorNode.textContent && !DaemonOptions.ParagraphTags.test(AnchorNode.nodeName.toLowerCase()) ? AnchorNode.textContent.length : 0;
                        break;
                    }
                    break;
                }
            }
        });
        return { AnchorNode, StartingOffset, FocusNode, EndOffset };
    }
    const debounceSelectionStatus = _.debounce(() => {
        DaemonState.SelectionStatusCache = GetSelectionStatus();
    }, 450);
    const debounceRollbackAndSync = _.debounce(FlushAllRecords, 500);
    const throttledFuncDelay = 200;
    const throttledRollbackAndSync = _.throttle(FlushAllRecords, throttledFuncDelay);
    // Primary entry point to supporting functionalities such as restoring selection.
    useLayoutEffect(() => {
        if (!WatchElementRef.current) {
            console.log("Invalid Watched Element");
            return;
        }
        DaemonState.EditorLocked = false;
        const WatchedElement = WatchElementRef.current;
        const contentEditableCached = WatchedElement.contentEditable;
        if (DaemonOptions === null || DaemonOptions === void 0 ? void 0 : DaemonOptions.IsEditable) {
            // !!plaintext-only actually introduces unwanted behavior
            WatchedElement.contentEditable = 'true';
            WatchElementRef.current.focus();
        }
        if (DaemonState.SelectionStatusCachePreBlur && DaemonOptions.IsEditable) {
            // consume the saved status
            RestoreSelectionStatus(WatchElementRef.current, DaemonState.SelectionStatusCachePreBlur);
            DaemonState.SelectionStatusCachePreBlur = null;
        }
        if (DaemonState.SelectionStatusCache) {
            // consume the saved status
            RestoreSelectionStatus(WatchElementRef.current, DaemonState.SelectionStatusCache);
            DaemonState.SelectionStatusCache = null;
            DaemonState.CaretOverrideTokens = [];
        }
        if (DaemonOptions.ShouldObserve) {
            ToggleObserve(true);
        }
        // clean up
        return () => {
            WatchedElement.contentEditable = contentEditableCached;
            ToggleObserve(false);
            if (DaemonState.SelectionStatusCache === null) {
                DaemonState.SelectionStatusCache = GetSelectionStatus();
            }
        };
    });
    // Event handler entry point
    useLayoutEffect(() => {
        if (!WatchElementRef.current || !MirrorDocumentRef.current) {
            return;
        }
        const WatchedElement = WatchElementRef.current;
        // bind Events
        const KeyDownHandler = (ev) => {
            // FIXME: for test purpose
            // if (ev.key === "t") {
            //     ev.preventDefault();
            //     console.log("testing...")
            //     DaemonState.SelectionStatusCache = GetSelectionStatus();
            //     DaemonState.CaretOverrideToken = "NextLine";
            //     // rollbackAndSync();
            //     if (DaemonState.SelectionStatusCache) {
            //         // consume the saved status
            //         RestoreSelectionStatus(WatchElementRef.current!, DaemonState.SelectionStatusCache);
            //         DaemonState.SelectionStatusCache = null;
            //         DaemonState.CaretOverrideToken = null;
            //     }
            // }
            if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && ev.code === 'KeyZ') {
                ev.preventDefault();
                ev.stopPropagation();
                throttledRollbackAndSync();
                setTimeout(() => UndoAndSync(), 0);
                return;
            }
            if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && ev.code === 'KeyY') {
                ev.preventDefault();
                ev.stopPropagation();
                RedoAndSync();
                return;
            }
        };
        const KeyUpHandler = (ev) => {
            debounceSelectionStatus();
            debounceRollbackAndSync();
        };
        const PastHandler = (ev) => {
            ev.preventDefault();
            const text = ev.clipboardData.getData('text/plain');
            // FIXME: Deprecated API, no alternative
            document.execCommand('insertText', false, text);
            debounceSelectionStatus();
            debounceRollbackAndSync();
        };
        const SelectionHandler = (ev) => {
            DaemonState.SelectionStatusCache =
                window.getSelection().rangeCount && ev.target === WatchedElement
                    ? GetSelectionStatus()
                    : null;
        };
        const BlurHandler = () => {
            DaemonState.SelectionStatusCachePreBlur = GetSelectionStatus();
        };
        const DoNothing = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
        };
        const MoveCaretToMouse = (event) => {
            let range = null;
            // FIXME: Deprecated API, but no real alternative
            if (typeof document.caretRangeFromPoint !== "undefined") {
                // Chromium
                range = document.caretRangeFromPoint(event.clientX, event.clientY);
            }
            else if (
            // @ts-expect-error: Firefox spec API
            typeof document.caretPositionFromPoint === "function") {
                // Firefox
                // @ts-expect-error: Firefox spec API
                const caretPos = document.caretPositionFromPoint(event.clientX, event.clientY);
                if (caretPos !== null) {
                    range = document.createRange();
                    range.setStart(caretPos.offsetNode, caretPos.offset);
                    range.collapse(true);
                }
            }
            const currentSelection = window.getSelection();
            if (currentSelection && currentSelection.isCollapsed && range) {
                currentSelection.removeAllRanges();
                currentSelection.addRange(range);
                DaemonState.SelectionStatusCache = GetSelectionStatus();
            }
        };
        WatchedElement.addEventListener("keydown", KeyDownHandler);
        WatchedElement.addEventListener("keyup", KeyUpHandler);
        WatchedElement.addEventListener("paste", PastHandler);
        WatchedElement.addEventListener("selectstart", SelectionHandler);
        WatchedElement.addEventListener("dragstart", DoNothing);
        WatchedElement.addEventListener("focusout", BlurHandler);
        WatchedElement.addEventListener("mouseup", MoveCaretToMouse);
        return () => {
            // WatchedElement.style.whiteSpace = whiteSpaceCached;
            WatchedElement.removeEventListener("keydown", KeyDownHandler);
            WatchedElement.removeEventListener("keyup", KeyUpHandler);
            WatchedElement.removeEventListener("paste", PastHandler);
            WatchedElement.removeEventListener("selectstart", SelectionHandler);
            WatchedElement.removeEventListener("dragstart", DoNothing);
            WatchedElement.removeEventListener("focusout", BlurHandler);
            WatchedElement.removeEventListener("mouseup", MoveCaretToMouse);
        };
    }, [WatchElementRef.current]);
    // Hook's public interface
    // Used by the already existing components in the editor
    return {
        DiscardHistory(DiscardCount) {
            let DiscardCountActual = 0;
            if (DiscardCount === 0)
                return;
            if (!DaemonState.UndoStack)
                return;
            if (DiscardCount > DaemonState.UndoStack.length) {
                DiscardCount = DaemonState.UndoStack.length;
            }
            while (DiscardCount) {
                DaemonState.UndoStack.pop();
                DiscardCountActual += 1;
                DiscardCount -= 1;
            }
            if (DaemonOptions.ShouldLog)
                console.log("DiscardHistory: ", DiscardCountActual, " Removed");
        },
        SyncNow() {
            return new Promise((resolve, reject) => {
                DaemonState.SelectionStatusCache = GetSelectionStatus();
                FlushAllRecords();
                resolve();
            });
        },
        SetFutureCaret(token) {
            DaemonState.CaretOverrideTokens.push(token);
        },
        AddToIgnore(Element, TriggerType, bIncludeAllChild = false) {
            if (!bIncludeAllChild && !Array.isArray(Element))
                return DaemonState.IgnoreMap.set(Element, TriggerType);
            if (!bIncludeAllChild && Array.isArray(Element)) {
                Element.slice().forEach(item => {
                    DaemonState.IgnoreMap.set(item, TriggerType);
                });
                return;
            }
            // Non-recursion func that add all child nodes to ignore too
            let queue;
            if (Array.isArray(Element)) {
                queue = [...Element];
            }
            else {
                queue = [Element];
            }
            while (queue.length) {
                const currentNode = queue.shift();
                if (!currentNode)
                    break;
                DaemonState.IgnoreMap.set(currentNode, TriggerType);
                Array.from(currentNode.childNodes).forEach(childNode => queue.push(childNode));
            }
        },
        AddToBindOperations(Element, Trigger, Operation) {
            //DEPRECATED
            DaemonState.BindOperationMap.set(Element, {
                Trigger: Trigger,
                Operations: Operation
            });
        },
        AddToOperations(Operation, ShouldLockPage = true) {
            if (!DaemonState.EditorLocked && ShouldLockPage) {
                if (!DaemonState.SelectionStatusCache)
                    DaemonState.SelectionStatusCache = GetSelectionStatus();
                ToggleObserve(false);
                WatchElementRef.current.contentEditable = 'false';
                if (WatchElementRef.current)
                    WatchElementRef.current.contentEditable = 'false';
                typeof DaemonOptions.OnRollback === 'function' && DaemonOptions.OnRollback();
                DaemonState.EditorLocked = true;
            }
            if (!Array.isArray(Operation))
                Operation = [Operation];
            DaemonState.AdditionalOperation.push(...Operation);
        }
    };
}
function ParseXPath(xpath) {
    const PathInformation = [];
    let parentPath = '';
    const pathSegments = xpath.split('/');
    for (const pathElement of pathSegments) {
        if (!pathElement)
            continue;
        if (pathElement === 'body' || pathElement === '/body')
            continue;
        let nodePath = pathElement;
        let index = null;
        const indexMatch = pathElement.match(/(.*)\[(\d+)]/);
        if (indexMatch) {
            nodePath = indexMatch[1];
            index = Number(indexMatch[2]) || null;
        }
        PathInformation.push({ nodePath, index, parentPath });
        parentPath += index ? `${nodePath}[${index}]/` : `/${nodePath}/`;
    }
    return PathInformation;
}
function GetNodeFromXPathInDoc(doc, XPath) {
    if (!doc) {
        console.error("GetNodeFromXPathInDoc: Invalid Doc");
        return;
    }
    return doc.evaluate(XPath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE).singleNodeValue;
}
function GetNodeFromXPathInHTMLElement(ContainerElement, XPath) {
    let evaluator = new XPathEvaluator();
    if (XPath === '')
        return;
    if (!evaluator) {
        console.error("GetNodeFromXPathInHTMLElement: Evaluator cannot be created.");
        return;
    }
    let result = evaluator.evaluate(XPath, ContainerElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue;
}
//Daemon's version of the helper, check with RegExp only, used in text node handling when trying to find the "top level" element under a container
function FindNearestParagraph(Node, NodeNameTest, UpperLimit) {
    let currentNode = Node;
    while (currentNode.parentNode && currentNode !== UpperLimit) {
        let parentNode = currentNode.parentNode;
        if (NodeNameTest.test(parentNode.nodeName.toLowerCase()))
            return parentNode;
        currentNode = parentNode;
    }
    return null;
}
/**
 * Checks if a given node has a specified ancestor within a certain number of levels.
 * Default to five level, needed for handling caret token
 */
function CheckForAncestor(node, searchAgainst, level = 5) {
    let ancestor = node;
    for (let i = 0; i < level; i++) {
        if (ancestor === searchAgainst) {
            return true;
        }
        if (!ancestor) {
            break;
        }
        ancestor = ancestor.parentNode;
    }
    return false;
}
