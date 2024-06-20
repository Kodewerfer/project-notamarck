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
import React, { useLayoutEffect, useRef, useState } from "react";
import { GetAllSurroundingText, GetCaretContext, GetChildNodesTextContent, TextNodeProcessor } from '../Utils/Helpers';
export default function PlainSyntax(_a) {
    var { children, tagName, daemonHandle } = _a, otherProps = __rest(_a, ["children", "tagName", "daemonHandle"]);
    const [SetActivation] = useState(() => {
        return ComponentActivation;
    }); // the Meta state, called by parent via dom fiber
    const [isEditing, setIsEditing] = useState(false); //Reactive state, toggled by the meta state
    const propSyntaxData = otherProps['data-md-syntax'];
    const propShouldWrap = otherProps['data-md-wrapped'];
    const SyntaxElementRefFront = useRef(null);
    const SyntaxElementRefRear = useRef(null);
    const TextContentMapRef = useRef(new Map());
    // the element tag
    const WholeElementRef = useRef(null);
    const ElementOBRef = useRef(null);
    function ComponentActivation(state) {
        var _a, _b, _c;
        if (!state) {
            (_a = ElementOBRef.current) === null || _a === void 0 ? void 0 : _a.takeRecords();
            (_b = ElementOBRef.current) === null || _b === void 0 ? void 0 : _b.disconnect();
            ElementOBRef.current = null;
            const TextContent = CompileAllTextNode();
            UpdateComponentAndSync(TextContent, WholeElementRef.current);
        }
        if (state) {
            daemonHandle.SyncNow();
            if (typeof MutationObserver) {
                ElementOBRef.current = new MutationObserver(ObserverHandler);
                WholeElementRef.current && ((_c = ElementOBRef.current) === null || _c === void 0 ? void 0 : _c.observe(WholeElementRef.current, {
                    childList: true,
                    subtree: true
                }));
            }
        }
        setIsEditing(state);
        return {
            enter: EnterKeyHandler
        };
    }
    // The whole component is replaced if key component of it is removed
    function ObserverHandler(mutationList) {
        mutationList.forEach((Record) => {
            if (!Record.removedNodes.length)
                return;
            Record.removedNodes.forEach((Node) => {
                if (Node === SyntaxElementRefFront.current || SyntaxElementRefRear.current || TextContentMapRef.current.get(Node)) {
                    daemonHandle.AddToOperations({
                        type: "REPLACE",
                        targetNode: WholeElementRef.current,
                        newNode: () => {
                            var _a;
                            return document.createTextNode(GetChildNodesTextContent((_a = WholeElementRef.current) === null || _a === void 0 ? void 0 : _a.childNodes));
                        }
                    });
                    daemonHandle.SyncNow();
                }
            });
        });
    }
    function EnterKeyHandler(ev) {
        ev.preventDefault();
        const { CurrentSelection } = GetCaretContext();
        let bShouldBreakLine = true;
        const TextContent = CompileAllTextNode();
        const { precedingText, followingText } = GetAllSurroundingText(CurrentSelection, WholeElementRef.current);
        if (precedingText.trim() === '' || precedingText.trim() === propSyntaxData)
            daemonHandle.SetFutureCaret("PrevElement");
        else if (followingText.trim() !== '')
            bShouldBreakLine = false;
        else
            daemonHandle.SetFutureCaret("NextElement");
        UpdateComponentAndSync(TextContent, WholeElementRef.current);
        return Promise.resolve(bShouldBreakLine);
    }
    // Called in meta state
    function CompileAllTextNode() {
        if (!WholeElementRef.current)
            return;
        let elementWalker = document.createTreeWalker(WholeElementRef.current, NodeFilter.SHOW_TEXT);
        let node;
        let textContent = '';
        while (node = elementWalker.nextNode()) {
            textContent += node.textContent === '\u00A0' ? "" : node.textContent;
        }
        return textContent;
    }
    // Called in meta state
    function UpdateComponentAndSync(TextNodeContent, ParentElement) {
        if (!TextNodeContent || !ParentElement)
            return;
        const textNodeResult = TextNodeProcessor(TextNodeContent);
        if (!textNodeResult)
            return;
        let documentFragment = document.createDocumentFragment();
        textNodeResult === null || textNodeResult === void 0 ? void 0 : textNodeResult.forEach(item => documentFragment.appendChild(item));
        daemonHandle.AddToOperations({
            type: "REPLACE",
            targetNode: ParentElement,
            newNode: documentFragment //first result node only
        });
        return daemonHandle.SyncNow();
    }
    // Add all nodes to ignore, update the central textnode ref, updating this component relies on activation function
    useLayoutEffect(() => {
        if (WholeElementRef.current && WholeElementRef.current.childNodes) {
            daemonHandle.AddToIgnore([...WholeElementRef.current.childNodes], "any", true);
        }
    });
    useLayoutEffect(() => {
        if (WholeElementRef.current && WholeElementRef.current.childNodes.length) {
            Array.from(WholeElementRef.current.childNodes).some((child) => {
                if (child.nodeType === Node.ELEMENT_NODE && !child.hasAttribute("data-is-generated")) {
                    TextContentMapRef.current.set(child, true);
                    return true;
                }
                if (child.nodeType === Node.TEXT_NODE) {
                    TextContentMapRef.current.set(child, true);
                    return true;
                }
            });
        }
        return () => {
            TextContentMapRef.current.clear();
        };
    });
    return React.createElement(tagName, Object.assign(Object.assign({}, otherProps), { ref: WholeElementRef }), [
        React.createElement('span', {
            'data-is-generated': true, //!!IMPORTANT!! custom attr for the daemon's find xp function, so that this element won't count towards to the number of sibling of the same name
            key: 'SyntaxFront',
            className: ` Text-Normal ${isEditing ? '' : 'Hide-It'}`
        }, ['\u00A0', (_jsx("span", { ref: SyntaxElementRefFront, contentEditable: false, children: propSyntaxData }, 'SyntaxFrontBlock'))]),
        ...(Array.isArray(children) ? children : [children]),
        propShouldWrap && React.createElement('span', {
            'data-is-generated': true, //!!IMPORTANT!! custom attr for the daemon's find xp function, so that this element won't count towards to the number of sibling of the same name
            key: 'SyntaxRear',
            className: `Text-Normal ${isEditing ? '' : 'Hide-It'}`
        }, [
            propShouldWrap ? (_jsx("span", { ref: SyntaxElementRefRear, contentEditable: false, children: propSyntaxData }, 'SyntaxRearBlock')) : null, '\u00A0'
        ])
    ]);
}
