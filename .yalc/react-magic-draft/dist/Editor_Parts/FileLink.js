var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
import React, { useContext, useLayoutEffect, useRef, useState } from "react";
import { GetAllSurroundingText, GetCaretContext, } from "../Utils/Helpers";
import { CompileAllTextNode, UpdateComponentAndSync } from "./Utils/CommonFunctions";
import { RecalibrateContainer } from "../context/ParentElementContext";
import classNames from "classnames/dedupe";
/**
 * A "Tag" link element is different in that it can be directly edited by the user once it is created.
 */
export default function FileLink(_a) {
    var _b;
    var { children, tagName, daemonHandle, initCallback, removeCallback } = _a, otherProps = __rest(_a, ["children", "tagName", "daemonHandle", "initCallback", "removeCallback"]);
    const [SetActivation] = useState(() => {
        return ComponentActivation;
    }); // the Meta state, called by parent via dom fiber
    const [isEditing, setIsEditing] = useState(false); //Reactive state, toggled by the meta state
    const FileLinkTarget = otherProps['data-file-link']; //prop passed down by the config func
    const FileLinkDisplayText = getLastPartOfPath(String(FileLinkTarget)).split('.')[0];
    // the element tag
    const FileLinkElementRef = useRef(null);
    // the "fake" display, wont be extracted as part of the syntax
    const FileLinkDisplayTextRef = useRef(null);
    const ElementOBRef = useRef(null);
    const ParentAction = useContext(RecalibrateContainer);
    function ComponentActivation(state) {
        var _a, _b, _c;
        const ComponentReturn = {
            "enter": HandleEnter,
            "backspaceOverride": BackspaceHandler,
            "delOverride": DelKeyHandler,
            element: FileLinkElementRef.current
        };
        // send whatever within the text node before re-rendering to the processor
        if (!state) {
            (_a = ElementOBRef.current) === null || _a === void 0 ? void 0 : _a.takeRecords();
            (_b = ElementOBRef.current) === null || _b === void 0 ? void 0 : _b.disconnect();
            ElementOBRef.current = null;
            if (typeof ParentAction === "function")
                ParentAction();
            else if (FileLinkElementRef.current) {
                const TextContent = CompileAllTextNode(FileLinkElementRef.current);
                UpdateComponentAndSync(daemonHandle, TextContent, FileLinkElementRef.current);
            }
        }
        if (state) {
            daemonHandle.SyncNow();
            if (typeof MutationObserver) {
                ElementOBRef.current = new MutationObserver(ObserverHandler);
                FileLinkElementRef.current && ((_c = ElementOBRef.current) === null || _c === void 0 ? void 0 : _c.observe(FileLinkElementRef.current, {
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
                if (Node === FileLinkDisplayTextRef.current) {
                    DeleteTagAndSync();
                }
            });
        });
    }
    function DeleteTagAndSync() {
        if (!FileLinkElementRef.current)
            return;
        daemonHandle.AddToOperations({
            type: "REMOVE",
            targetNode: FileLinkElementRef.current,
        });
        if (typeof removeCallback === "function")
            removeCallback(FileLinkTarget);
        return daemonHandle.SyncNow();
    }
    function HandleEnter(ev) {
        ev.preventDefault();
        const { CurrentSelection } = GetCaretContext();
        let bShouldBreakLine = true;
        const TextContent = CompileAllTextNode(FileLinkElementRef.current);
        const { precedingText, followingText } = GetAllSurroundingText(CurrentSelection, FileLinkElementRef.current);
        if (precedingText.trim() === '')
            daemonHandle.SetFutureCaret("PrevElement");
        else if (followingText.trim() !== '')
            bShouldBreakLine = false;
        else
            daemonHandle.SetFutureCaret("NextElement");
        if (typeof ParentAction === "function")
            ParentAction();
        else
            UpdateComponentAndSync(daemonHandle, TextContent, FileLinkElementRef.current);
        return Promise.resolve(bShouldBreakLine);
    }
    // because of the simple nature of the file link, del and backspace will simply delete the element
    function BackspaceHandler(ev) {
        ev.stopImmediatePropagation();
        ev.preventDefault();
        DeleteTagAndSync();
    }
    function DelKeyHandler(ev) {
        ev.stopImmediatePropagation();
        ev.preventDefault();
        DeleteTagAndSync();
    }
    // run the init callback each time
    useLayoutEffect(() => {
        (() => __awaiter(this, void 0, void 0, function* () {
            if (typeof initCallback === "function")
                yield initCallback(FileLinkTarget);
        }))();
    }, []);
    // Like other in-line components, the component's node are exempt from ob, all updates are handled via addops in ComponentActivation
    useLayoutEffect(() => {
        var _a;
        if (typeof children === 'string')
            children = children.trim();
        if (FileLinkElementRef.current && ((_a = FileLinkElementRef.current) === null || _a === void 0 ? void 0 : _a.firstChild))
            daemonHandle.AddToIgnore([...FileLinkElementRef.current.childNodes], "any", true);
    });
    // Add component classed on top of classes that may be added to it
    const combinedClassnames = classNames((_b = FileLinkElementRef === null || FileLinkElementRef === void 0 ? void 0 : FileLinkElementRef.current) === null || _b === void 0 ? void 0 : _b.className, `file-link`, { "is-active": isEditing });
    return React.createElement(tagName, Object.assign(Object.assign({}, otherProps), { className: combinedClassnames, ref: FileLinkElementRef }), [
        _jsx("span", { "data-is-generated": true, children: '\u00A0' }, "FrontSpacing"),
        _jsxs("span", { "data-is-generated": true, className: 'Hide-It', children: [":Link[", FileLinkTarget, "]"] }, "HiddenSyntaxFront"),
        (_jsx("span", { ref: FileLinkDisplayTextRef, "data-fake-text": true, contentEditable: false, children: FileLinkDisplayText }, "TagDisplay")), //!!important data-fake-text will not be extracted as part of the syntax
        _jsx("span", { "data-is-generated": true, children: '\u00A0' }, "BackSpacing"),
    ]);
}
// helper, get the "filename" of a file path (or dir)
export function getLastPartOfPath(fullPath) {
    let tempPath = fullPath.replace(/\\/g, '/');
    let pathParts = tempPath.split('/');
    return pathParts[pathParts.length - 1] || "";
}
