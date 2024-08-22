var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from "react";
import { GetCaretContext, GetChildNodesAsHTMLString, GetLastTextNode, GetNextSiblings, MoveCaretIntoNode, MoveCaretToNode } from "../Utils/Helpers";
import { CompileAllTextNode, UpdateContainerAndSync } from "./Utils/CommonFunctions";
import { RecalibrateContainer } from "../context/ParentElementContext";
export function ListContainer(_a) {
    var { children, tagName, parentSetActivation, daemonHandle } = _a, otherProps = __rest(_a, ["children", "tagName", "parentSetActivation", "daemonHandle"]);
    const ListContainerRef = useRef(null);
    return React.createElement(tagName, Object.assign({ ref: ListContainerRef, className: "list-container" }, otherProps), children);
}
export function ListItem(_a) {
    var { children, tagName, daemonHandle } = _a, otherProps = __rest(_a, ["children", "tagName", "daemonHandle"]);
    const [SetActivation] = useState(() => {
        return ComponentActivation;
    }); // the Meta state, called by parent via dom fiber
    const [isEditing, setIsEditing] = useState(false); //Not directly used, but VITAL
    const CurrentListItemRef = useRef(null);
    const ListSyntaxFiller = useRef(); //filler element
    const ElementOBRef = useRef(null);
    function ComponentActivation(state) {
        var _a, _b, _c;
        if (!state) {
            (_a = ElementOBRef.current) === null || _a === void 0 ? void 0 : _a.takeRecords();
            (_b = ElementOBRef.current) === null || _b === void 0 ? void 0 : _b.disconnect();
            ElementOBRef.current = null;
        }
        if (state) {
            daemonHandle.SyncNow();
            if (typeof MutationObserver) {
                ElementOBRef.current = new MutationObserver(ObserverHandler);
                CurrentListItemRef.current && ((_c = ElementOBRef.current) === null || _c === void 0 ? void 0 : _c.observe(CurrentListItemRef.current, {
                    childList: true
                }));
            }
        }
        setIsEditing(state);
        return {
            "enter": EnterKeyHandler,
            "delJoining": DelKeyHandler,
            element: CurrentListItemRef.current
        };
    }
    function ObserverHandler(mutationList) {
        mutationList.forEach((Record) => {
            if (!Record.removedNodes.length)
                return;
            Record.removedNodes.forEach((Node) => {
                var _a, _b;
                if (Node === ListSyntaxFiller.current) {
                    daemonHandle.AddToOperations([
                        {
                            type: "REMOVE",
                            targetNode: CurrentListItemRef.current,
                        },
                        {
                            type: "ADD",
                            newNode: () => {
                                var _a;
                                const ReplacementElement = document.createElement('p');
                                ReplacementElement.innerHTML = GetChildNodesAsHTMLString((_a = CurrentListItemRef.current) === null || _a === void 0 ? void 0 : _a.childNodes);
                                return ReplacementElement;
                            },
                            parentXP: "//body",
                            siblingNode: (_b = (_a = CurrentListItemRef.current) === null || _a === void 0 ? void 0 : _a.parentNode) === null || _b === void 0 ? void 0 : _b.nextSibling
                        }
                    ]);
                    daemonHandle.SyncNow();
                }
            });
        });
    }
    function DelKeyHandler(ev) {
        var _a;
        const { CurrentSelection, CurrentAnchorNode, RemainingText } = GetCaretContext();
        if (!CurrentSelection || !CurrentAnchorNode)
            return;
        // caret lands on the leading syntax element or on the li itself, move it into the text node
        if (CurrentAnchorNode.nodeType !== Node.TEXT_NODE || CurrentAnchorNode.contentEditable === 'false') {
            if (!CurrentListItemRef.current || !CurrentListItemRef.current.childNodes.length)
                return;
            for (let ChildNode of CurrentListItemRef.current.childNodes) {
                if (ChildNode.nodeType === Node.TEXT_NODE)
                    MoveCaretToNode(ChildNode, 0);
            }
            return;
        }
        if (RemainingText.trim() !== '' || CurrentAnchorNode.nextSibling)
            return;
        if (!CurrentListItemRef.current)
            return;
        // Check for next element sibling, if last, check for parent level sibling
        let nextElementSibling = (_a = CurrentListItemRef.current) === null || _a === void 0 ? void 0 : _a.nextElementSibling;
        if (!nextElementSibling && CurrentListItemRef.current.parentNode) {
            nextElementSibling = CurrentListItemRef.current.parentNode.nextElementSibling;
        }
        if (!nextElementSibling)
            return;
        // Not a li, move caret only
        if (nextElementSibling.tagName.toLowerCase() !== 'li') {
            MoveCaretIntoNode(nextElementSibling);
            return;
        }
        // End of line, join with the next list item
        let MergedListItem = CurrentListItemRef.current.cloneNode(true);
        nextElementSibling.childNodes.forEach((ChildNode) => {
            MergedListItem.appendChild(ChildNode.cloneNode(true));
        });
        daemonHandle.AddToOperations({
            type: "REMOVE",
            targetNode: nextElementSibling,
        });
        daemonHandle.AddToOperations({
            type: "REPLACE",
            targetNode: CurrentListItemRef.current,
            newNode: MergedListItem
        });
        daemonHandle.SyncNow();
    }
    function EnterKeyHandler(ev) {
        var _a, _b, _c, _d, _e;
        ev.preventDefault();
        ev.stopPropagation();
        console.log("List Enter");
        const { CurrentSelection, CurrentAnchorNode, RemainingText, PrecedingText } = GetCaretContext();
        if (!CurrentSelection || !CurrentAnchorNode)
            return;
        if (!CurrentSelection.isCollapsed)
            return CurrentSelection.collapseToEnd();
        // caret lands on the leading syntax element or on the li itself, move it into the text node
        if (CurrentAnchorNode.nodeType !== Node.TEXT_NODE || CurrentAnchorNode.contentEditable === 'false') {
            if (!CurrentListItemRef.current || !CurrentListItemRef.current.childNodes.length)
                return;
            for (let ChildNode of CurrentListItemRef.current.childNodes) {
                if (ChildNode.nodeType === Node.TEXT_NODE)
                    MoveCaretToNode(ChildNode, 0);
            }
            return;
        }
        const currentRange = CurrentSelection.getRangeAt(0);
        const AnchorPrevSibling = CurrentAnchorNode.previousElementSibling;
        const bLeadingPosition = currentRange.startOffset === 0
            || (AnchorPrevSibling && AnchorPrevSibling.contentEditable === 'false');
        // Beginning of the line, Only add empty line before container if it's the first element of the first list item
        if (PrecedingText.trim() === '' && bLeadingPosition) {
            console.log("Breaking - List BOL");
            const ListContainer = (_a = CurrentListItemRef.current) === null || _a === void 0 ? void 0 : _a.parentNode;
            if (ListContainer && ListContainer.firstElementChild === CurrentListItemRef.current) {
                // A new line with only a br
                const lineBreakElement = document.createElement("br");
                const NewLine = document.createElement("p"); // The new line
                NewLine.appendChild(lineBreakElement);
                daemonHandle.AddToOperations({
                    type: "ADD",
                    newNode: NewLine,
                    siblingNode: ListContainer,
                    parentXP: "//body"
                });
                daemonHandle.SetFutureCaret("NextLine");
                daemonHandle.SyncNow();
                return;
            }
            let TargetNode = GetLastTextNode(CurrentListItemRef.current);
            if (!TargetNode || !TargetNode.textContent)
                return;
            MoveCaretToNode(TargetNode, TargetNode.textContent.length);
            return;
        }
        const FollowingNodes = GetNextSiblings(CurrentAnchorNode);
        // End of the line, Only add empty line after the ul container if last element of the last item list
        // otherwise, move caret to the next line
        if (RemainingText.trim() === '' && !FollowingNodes.length) {
            console.log("Breaking - List EOL");
            const ListContainer = (_b = CurrentListItemRef.current) === null || _b === void 0 ? void 0 : _b.parentNode;
            if (ListContainer && ListContainer.lastElementChild === CurrentListItemRef.current)
                return true;
            //move caret to the next line
            if (((_c = CurrentListItemRef.current) === null || _c === void 0 ? void 0 : _c.nextElementSibling) && CurrentListItemRef.current.nextElementSibling.childNodes.length) {
                let TargetNode = null;
                for (let childNode of CurrentListItemRef.current.nextElementSibling.childNodes) {
                    if (childNode.nodeType === Node.TEXT_NODE) {
                        TargetNode = childNode;
                    }
                }
                if (!TargetNode || !TargetNode.textContent)
                    return;
                MoveCaretToNode(TargetNode, 0);
                return;
            }
        }
        // mid-line enter key, move what is following the caret to the next line as new li
        if (!CurrentListItemRef.current)
            return;
        if (!CurrentListItemRef.current.childNodes || !CurrentListItemRef.current.childNodes.length)
            return;
        // No following element or text content
        if ((!RemainingText || RemainingText.trim() === '') && !FollowingNodes.length) {
            // Move caret to the end of the last text node.
            let TargetNode = GetLastTextNode(CurrentListItemRef.current);
            if (!TargetNode || !TargetNode.textContent)
                return;
            MoveCaretToNode(TargetNode, TargetNode.textContent.length);
            return;
        }
        // Normal logic
        console.log("Breaking - List Mid-Line");
        const NewLine = document.createElement("li"); // New list item
        let anchorNodeClone = CurrentAnchorNode.cloneNode(true);
        if (anchorNodeClone.textContent !== null)
            anchorNodeClone.textContent = RemainingText;
        NewLine.appendChild(anchorNodeClone);
        if (FollowingNodes.length) {
            for (let Node of FollowingNodes) {
                NewLine.appendChild(Node.cloneNode(true));
                daemonHandle.AddToOperations({
                    type: "REMOVE",
                    targetNode: Node,
                });
            }
        }
        daemonHandle.AddToOperations({
            type: "TEXT",
            targetNode: CurrentAnchorNode,
            nodeText: PrecedingText
        });
        daemonHandle.AddToOperations({
            type: "ADD",
            newNode: NewLine,
            siblingNode: (_d = CurrentListItemRef.current) === null || _d === void 0 ? void 0 : _d.nextSibling,
            parentNode: (_e = CurrentListItemRef.current) === null || _e === void 0 ? void 0 : _e.parentNode
        });
        daemonHandle.SetFutureCaret('NextElement');
        daemonHandle.SyncNow();
        return;
    }
    // Add filler element to ignore, add filler element's special handling operation
    useEffect(() => {
        if (ListSyntaxFiller.current) {
            daemonHandle.AddToIgnore(ListSyntaxFiller.current, "any");
        }
    });
    function ContainerUpdate() {
        console.log("Sub element changed, List items update.");
        const compileAllTextNode = CompileAllTextNode(CurrentListItemRef.current);
        if (CurrentListItemRef.current && CurrentListItemRef.current.parentNode)
            UpdateContainerAndSync(daemonHandle, compileAllTextNode, CurrentListItemRef.current, tagName);
    }
    return _jsx(RecalibrateContainer.Provider, { value: ContainerUpdate, children: React.createElement(tagName, Object.assign(Object.assign({}, otherProps), { className: `list-item ${isEditing ? "is-active" : ""}`, ref: CurrentListItemRef }), [
            React.createElement('span', {
                'data-is-generated': true, //!!IMPORTANT!! custom attr for the daemon's find xp function, so that this element won't count towards to the number of sibling of the same name
                key: 'HeaderSyntaxLead',
                ref: ListSyntaxFiller,
                contentEditable: false,
                className: ` ${isEditing ? '' : 'Hide-It'}`
            }, "- "),
            ...(Array.isArray(children) ? children : [children]),
        ]) });
}
