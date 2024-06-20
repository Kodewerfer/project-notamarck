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
import { GetChildNodesAsHTMLString } from '../Utils/Helpers';
export default function Paragraph(_a) {
    var { children, tagName, isHeader, headerSyntax, daemonHandle } = _a, otherProps = __rest(_a, ["children", "tagName", "isHeader", "headerSyntax", "daemonHandle"]);
    const [SetActivation] = useState(() => {
        return ComponentActivation;
    }); // the Meta state, called by parent via dom fiber
    const [isEditing, setIsEditing] = useState(false); //Not directly used, but VITAL
    const MainElementRef = useRef(null);
    const SyntaxElementRef = useRef(); //filler element
    const ElementOBRef = useRef(null);
    function ComponentActivation(state) {
        var _a, _b, _c;
        if (!state) {
            (_a = ElementOBRef.current) === null || _a === void 0 ? void 0 : _a.takeRecords();
            (_b = ElementOBRef.current) === null || _b === void 0 ? void 0 : _b.disconnect();
            ElementOBRef.current = null;
        }
        if (state) {
            // FIXME:caused too much input interruption, need more testing.
            // daemonHandle.SyncNow();
            if (typeof MutationObserver) {
                ElementOBRef.current = new MutationObserver(ObserverHandler);
                MainElementRef.current && ((_c = ElementOBRef.current) === null || _c === void 0 ? void 0 : _c.observe(MainElementRef.current, {
                    childList: true
                }));
            }
        }
        setIsEditing(state);
        // Paragraph no need for special handling for enter and dels
        return {};
    }
    function ObserverHandler(mutationList) {
        mutationList.forEach((Record) => {
            if (!Record.removedNodes.length)
                return;
            Record.removedNodes.forEach((Node) => {
                if (Node === SyntaxElementRef.current) {
                    daemonHandle.AddToOperations({
                        type: "REPLACE",
                        targetNode: MainElementRef.current,
                        newNode: () => {
                            var _a;
                            const ReplacementElement = document.createElement('p');
                            ReplacementElement.innerHTML = GetChildNodesAsHTMLString((_a = MainElementRef.current) === null || _a === void 0 ? void 0 : _a.childNodes);
                            return ReplacementElement;
                        }
                    });
                    daemonHandle.SyncNow();
                }
            });
        });
    }
    // // Self destruct if no child element
    // useEffect(() => {
    //     if (!children || React.Children.count(children) === 1) {
    //         if (String(children).trim() === '' && MainElementRef.current) {
    //
    //             daemonHandle.AddToOperations(
    //                 {
    //                     type: "REMOVE",
    //                     targetNode: MainElementRef.current,
    //                 }
    //             );
    //
    //             MainElementRef.current = null;
    //             daemonHandle.SyncNow();
    //             daemonHandle.DiscardHistory(1);
    //
    //         }
    //     }
    // });
    // Add filler element to ignore, add filler element's special handling operation
    useEffect(() => {
        if (isHeader && SyntaxElementRef.current)
            daemonHandle.AddToIgnore(SyntaxElementRef.current, "any");
    });
    return React.createElement(tagName, Object.assign(Object.assign({}, otherProps), { ref: MainElementRef }), [
        isHeader && React.createElement('span', {
            'data-is-generated': true, //!!IMPORTANT!! custom attr for the daemon's find xp function, so that this element won't count towards to the number of sibling of the same name
            key: 'HeaderSyntaxLead',
            ref: SyntaxElementRef,
            contentEditable: false,
            className: ` ${isEditing ? '' : 'Hide-It'}`
        }, headerSyntax),
        ...(Array.isArray(children) ? children : [children]),
    ]);
}
;
