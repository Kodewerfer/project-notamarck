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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useLayoutEffect, useRef, useState } from "react";
import { GetAllSurroundingText, GetCaretContext, TextNodeProcessor } from "../Utils/Helpers";
/**
 *  In current implementation, the Link component is a special kind of "plainSyntax" component which are in-line elements in nature
 *  Many of the functionalities are the same, but since link have some specialities and may undergo changes, the code are kept seperated.
 * */
export default function Links(_a) {
    var { children, tagName, daemonHandle } = _a, otherProps = __rest(_a, ["children", "tagName", "daemonHandle"]);
    const [SetActivation] = useState(() => {
        return ComponentActivation;
    }); // the Meta state, called by parent via dom fiber
    const [isEditing, setIsEditing] = useState(false); //Reactive state, toggled by the meta state
    // the element tag
    const LinkElementRef = useRef(null);
    const LinkAddrRef = useRef(null);
    const LinkedContentMapRef = useRef(new Map());
    const ElementOBRef = useRef(null);
    function ComponentActivation(state) {
        var _a, _b, _c;
        const ComponentReturn = {
            "enter": HandleEnter
        };
        // send whatever within the text node before re-rendering to the processor
        if (!state) {
            (_a = ElementOBRef.current) === null || _a === void 0 ? void 0 : _a.takeRecords();
            (_b = ElementOBRef.current) === null || _b === void 0 ? void 0 : _b.disconnect();
            ElementOBRef.current = null;
            if (LinkElementRef.current) {
                const TextContent = CompileAllTextNode();
                UpdateComponentAndSync(TextContent, LinkElementRef.current);
            }
        }
        if (state) {
            daemonHandle.SyncNow();
            if (typeof MutationObserver) {
                ElementOBRef.current = new MutationObserver(ObserverHandler);
                LinkElementRef.current && ((_c = ElementOBRef.current) === null || _c === void 0 ? void 0 : _c.observe(LinkElementRef.current, {
                    childList: true,
                    subtree: true
                }));
            }
        }
        setIsEditing(state);
        return ComponentReturn;
    }
    function ObserverHandler(mutationList) {
        mutationList.forEach((Record) => {
            if (!Record.removedNodes.length)
                return;
            Record.removedNodes.forEach((Node) => {
                if (Node === LinkAddrRef.current || LinkedContentMapRef.current.get(Node)) {
                    const TextContent = CompileAllTextNode();
                    UpdateComponentAndSync(TextContent, LinkElementRef.current);
                }
            });
        });
    }
    function CompileAllTextNode() {
        if (!LinkElementRef.current)
            return;
        let elementWalker = document.createTreeWalker(LinkElementRef.current, NodeFilter.SHOW_TEXT);
        let node;
        let textContent = '';
        while (node = elementWalker.nextNode()) {
            textContent += node.textContent;
        }
        return textContent.trim();
    }
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
    function HandleEnter(ev) {
        ev.preventDefault();
        const { CurrentSelection } = GetCaretContext();
        let bShouldBreakLine = true;
        const TextContent = CompileAllTextNode();
        const { precedingText, followingText } = GetAllSurroundingText(CurrentSelection, LinkElementRef.current);
        if (precedingText.trim() === '')
            daemonHandle.SetFutureCaret("PrevElement");
        else if (followingText.trim() !== '')
            bShouldBreakLine = false;
        else
            daemonHandle.SetFutureCaret("NextElement");
        UpdateComponentAndSync(TextContent, LinkElementRef.current);
        return Promise.resolve(bShouldBreakLine);
    }
    // Like other in-line components, the component's node are exempt from ob, all updates are handled via addops in ComponentActivation
    useLayoutEffect(() => {
        var _a;
        if (typeof children === 'string')
            children = children.trim();
        if (LinkElementRef.current && ((_a = LinkElementRef.current) === null || _a === void 0 ? void 0 : _a.firstChild))
            daemonHandle.AddToIgnore([...LinkElementRef.current.childNodes], "any", true);
    });
    // effectively add all "children" to LinkedContentMapRef.current
    // Link can wrap other in-line elements
    useLayoutEffect(() => {
        if (LinkElementRef.current && LinkElementRef.current.childNodes.length) {
            Array.from(LinkElementRef.current.childNodes).some((child) => {
                if (child.nodeType === Node.ELEMENT_NODE && !child.hasAttribute("data-is-generated")) {
                    LinkedContentMapRef.current.set(child, true);
                    return true;
                }
                if (child.nodeType === Node.TEXT_NODE) {
                    LinkedContentMapRef.current.set(child, true);
                    return true;
                }
            });
        }
        return () => {
            LinkedContentMapRef.current.clear();
        };
    });
    return React.createElement(tagName, Object.assign(Object.assign({}, otherProps), { ref: LinkElementRef }), [
        _jsxs("span", { className: `Text-Normal ${isEditing ? "" : 'Hide-It'}`, "data-is-generated": true, children: ['\u00A0', _jsx("span", { contentEditable: false, children: "[" })] }, 'SyntaxFrontBracket'),
        // link text
        ...(Array.isArray(children) ? children : [children]),
        _jsx("span", { className: `Text-Normal ${isEditing ? "" : 'Hide-It'}`, "data-is-generated": true, contentEditable: false, children: ']' }, 'SyntaxRearBracket'),
        // the link address
        _jsx("span", { className: `Text-Normal ${isEditing ? "" : 'Hide-It'}`, "data-is-generated": true, children: _jsx("span", { ref: LinkAddrRef, children: `(${otherProps['href'] || ''})\u00A0` }) }, 'SyntaxLinkAddr'),
    ]);
}
