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
import React, { useContext, useLayoutEffect, useRef, useState } from "react";
import { GetAllSurroundingText, GetCaretContext, GetChildNodesTextContent, } from '../Utils/Helpers';
import { CompileAllTextNode, UpdateComponentAndSync } from "./Utils/CommonFunctions";
import { RecalibrateContainer } from "../context/ParentElementContext";
export default function PlainSyntax(_a) {
    var { children, tagName, daemonHandle } = _a, otherProps = __rest(_a, ["children", "tagName", "daemonHandle"]);
    const [SetActivation] = useState(() => {
        return ComponentActivation;
    }); // the Meta state, called by parent via dom fiber
    const [isEditing, setIsEditing] = useState(false); //Reactive state, toggled by the meta state
    const propSyntaxData = otherProps['data-md-syntax'];
    const propShouldWrap = otherProps['data-md-wrapped'];
    const SyntaxElementRefFrontWrapper = useRef(null);
    const SyntaxElementRefFront = useRef(null);
    const SyntaxElementRefRearWrapper = useRef(null);
    const SyntaxElementRefRear = useRef(null);
    const TextContentMapRef = useRef(new Map());
    // the element tag
    const WholeElementRef = useRef(null);
    const ElementOBRef = useRef(null);
    const ParentAction = useContext(RecalibrateContainer);
    function ComponentActivation(state) {
        var _a, _b, _c;
        if (!state) {
            (_a = ElementOBRef.current) === null || _a === void 0 ? void 0 : _a.takeRecords();
            (_b = ElementOBRef.current) === null || _b === void 0 ? void 0 : _b.disconnect();
            ElementOBRef.current = null;
            if (typeof ParentAction === "function")
                ParentAction();
            else {
                const TextContent = CompileAllTextNode(WholeElementRef.current);
                UpdateComponentAndSync(daemonHandle, TextContent, WholeElementRef.current);
            }
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
            enter: EnterKeyHandler,
            "backspaceOverride": BackspaceHandler,
            "delOverride": DelKeyHandler,
            element: WholeElementRef.current
        };
    }
    // The whole component is replaced if key component of it is removed
    function ObserverHandler(mutationList) {
        mutationList.forEach((Record) => {
            if (!Record.removedNodes.length)
                return;
            Record.removedNodes.forEach((Node) => {
                if (Node === SyntaxElementRefFront.current || SyntaxElementRefRear.current || TextContentMapRef.current.get(Node)) {
                    if (typeof ParentAction === "function")
                        return ParentAction();
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
        const TextContent = CompileAllTextNode(WholeElementRef.current);
        const { precedingText, followingText } = GetAllSurroundingText(CurrentSelection, WholeElementRef.current);
        if (precedingText.trim() === '' || precedingText.trim() === propSyntaxData)
            daemonHandle.SetFutureCaret("PrevElement");
        else if (followingText.trim() !== '')
            bShouldBreakLine = false;
        else
            daemonHandle.SetFutureCaret("NextElement");
        if (typeof ParentAction === "function")
            ParentAction();
        else
            UpdateComponentAndSync(daemonHandle, TextContent, WholeElementRef.current);
        return Promise.resolve(bShouldBreakLine);
    }
    // if backspace key is pressed in the second syntax block, or del in the firs, delete the syntax block(re-render component as normal text)
    function BackspaceHandler(ev) {
        var _a, _b;
        ev.stopImmediatePropagation();
        let { PrecedingText, CurrentSelection, CurrentAnchorNode } = GetCaretContext();
        if (!CurrentAnchorNode || !CurrentSelection)
            return;
        if (((_a = SyntaxElementRefRearWrapper.current) === null || _a === void 0 ? void 0 : _a.contains(CurrentAnchorNode)) && PrecedingText.trim() === "") {
            ev.preventDefault();
            (_b = WholeElementRef.current) === null || _b === void 0 ? void 0 : _b.removeChild(SyntaxElementRefRearWrapper.current);
            return false;
        }
        return true;
    }
    function DelKeyHandler(ev) {
        var _a, _b;
        ev.stopImmediatePropagation();
        let { CurrentSelection, CurrentAnchorNode, TextAfterSelection } = GetCaretContext();
        if (!CurrentAnchorNode || !CurrentSelection)
            return;
        if (((_a = SyntaxElementRefFrontWrapper.current) === null || _a === void 0 ? void 0 : _a.contains(CurrentAnchorNode)) && (!TextAfterSelection || TextAfterSelection.trim() === "")) {
            ev.preventDefault();
            (_b = WholeElementRef.current) === null || _b === void 0 ? void 0 : _b.removeChild(SyntaxElementRefFrontWrapper.current);
            return false;
        }
        return true;
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
    return React.createElement(tagName, Object.assign(Object.assign({}, otherProps), { className: `in-line-element ${isEditing ? "is-active" : ""}`, ref: WholeElementRef }), [
        React.createElement('span', {
            'data-is-generated': true, //!!IMPORTANT!! custom attr for the daemon's find xp function, so that this element won't count towards to the number of sibling of the same name
            key: 'SyntaxFront',
            ref: SyntaxElementRefFrontWrapper,
            className: ` Text-Normal ${isEditing ? '' : 'Hide-It'}`
        }, ['\u00A0', (_jsx("span", { ref: SyntaxElementRefFront, contentEditable: false, children: propSyntaxData }, 'SyntaxFrontBlock'))]),
        ...(Array.isArray(children) ? children : [children]),
        propShouldWrap && React.createElement('span', {
            'data-is-generated': true, //!!IMPORTANT!! custom attr for the daemon's find xp function, so that this element won't count towards to the number of sibling of the same name
            key: 'SyntaxRear',
            ref: SyntaxElementRefRearWrapper,
            className: `Text-Normal ${isEditing ? '' : 'Hide-It'}`
        }, [
            propShouldWrap ? (_jsx("span", { ref: SyntaxElementRefRear, contentEditable: false, children: propSyntaxData }, 'SyntaxRearBlock')) : null, '\u00A0'
        ])
    ]);
}
