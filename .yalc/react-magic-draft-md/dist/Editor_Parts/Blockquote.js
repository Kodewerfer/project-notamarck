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
import React, { useEffect, useRef, useState } from "react";
import { GetCaretContext, GetChildNodesAsHTMLString, GetFirstTextNode, GetLastTextNode, MoveCaretToNode } from "../Utils/Helpers";
export function Blockquote(_a) {
    var { children, tagName, parentSetActivation, daemonHandle } = _a, otherProps = __rest(_a, ["children", "tagName", "parentSetActivation", "daemonHandle"]);
    const ContainerRef = useRef(null);
    return React.createElement(tagName, Object.assign({ ref: ContainerRef }, otherProps), children);
}
export function QuoteItem(_a) {
    var { children, tagName, daemonHandle } = _a, otherProps = __rest(_a, ["children", "tagName", "daemonHandle"]);
    const [SetActivation] = useState(() => {
        return ComponentActivation;
    }); // the Meta state, called by parent via dom fiber
    const [isEditing, setIsEditing] = useState(false); //Not directly used, but VITAL
    const WholeElementRef = useRef(null);
    const QuoteSyntaxFiller = useRef(); //filler element
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
                WholeElementRef.current && ((_c = ElementOBRef.current) === null || _c === void 0 ? void 0 : _c.observe(WholeElementRef.current, {
                    childList: true
                }));
            }
        }
        setIsEditing(state);
        return {
            "enter": EnterKeyHandler,
            "delJoining": DelKeyHandler,
        };
    }
    function ObserverHandler(mutationList) {
        mutationList.forEach((Record) => {
            if (!Record.removedNodes.length)
                return;
            Record.removedNodes.forEach((Node) => {
                var _a, _b;
                if (Node === QuoteSyntaxFiller.current) {
                    daemonHandle.AddToOperations([
                        {
                            type: "REMOVE",
                            targetNode: WholeElementRef.current,
                        },
                        {
                            type: "ADD",
                            newNode: () => {
                                var _a;
                                const ReplacementElement = document.createElement('p');
                                ReplacementElement.innerHTML = GetChildNodesAsHTMLString((_a = WholeElementRef.current) === null || _a === void 0 ? void 0 : _a.childNodes);
                                return ReplacementElement;
                            },
                            parentXP: "//body",
                            siblingNode: (_b = (_a = WholeElementRef.current) === null || _a === void 0 ? void 0 : _a.parentNode) === null || _b === void 0 ? void 0 : _b.nextSibling
                        }
                    ]);
                    daemonHandle.SyncNow();
                }
            });
        });
    }
    function DelKeyHandler(ev) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
    }
    function EnterKeyHandler(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!WholeElementRef.current)
            return;
        const { CurrentSelection, CurrentAnchorNode, RemainingText, PrecedingText } = GetCaretContext();
        if (!CurrentSelection || !CurrentAnchorNode)
            return;
        if (CurrentAnchorNode.nodeType !== Node.TEXT_NODE)
            MoveCaretToNode(GetFirstTextNode(WholeElementRef.current), 0);
        // Add new line before the blockquote
        if (PrecedingText.trim() === '') {
            const BlockQuoteElement = WholeElementRef.current.parentNode;
            if (!BlockQuoteElement)
                return;
            // A new line with only a br
            const lineBreakElement = document.createElement("br");
            const NewLine = document.createElement("p"); // The new line
            NewLine.appendChild(lineBreakElement);
            daemonHandle.AddToOperations({
                type: "ADD",
                newNode: NewLine,
                siblingNode: BlockQuoteElement,
                parentXP: "//body"
            });
            daemonHandle.SetFutureCaret("NextLine");
            daemonHandle.SyncNow();
            return;
        }
        // reuse editor default, this will add p tag after block quote
        if (RemainingText.trim() === '')
            return true;
        // mid-line enter key
        // only Move caret to the end of the last text node.
        if (!WholeElementRef.current.childNodes || !WholeElementRef.current.childNodes.length)
            return;
        let TargetNode = GetLastTextNode(WholeElementRef.current);
        if (!TargetNode || !TargetNode.textContent)
            return;
        MoveCaretToNode(TargetNode, TargetNode.textContent.length);
        return;
    }
    // Add filler element to ignore, add filler element's special handling operation
    useEffect(() => {
        if (QuoteSyntaxFiller.current) {
            daemonHandle.AddToIgnore(QuoteSyntaxFiller.current, "any");
        }
    });
    return React.createElement(tagName, Object.assign(Object.assign({}, otherProps), { ref: WholeElementRef }), [
        React.createElement('span', {
            'data-is-generated': true, //!!IMPORTANT!! custom attr for the daemon's find xp function, so that this element won't count towards to the number of sibling of the same name
            key: 'QuoteSyntaxLead',
            ref: QuoteSyntaxFiller,
            contentEditable: false,
            className: ` ${isEditing ? '' : 'Hide-It'}`
        }, "> "),
        ...(Array.isArray(children) ? children : [children]),
    ]);
}
