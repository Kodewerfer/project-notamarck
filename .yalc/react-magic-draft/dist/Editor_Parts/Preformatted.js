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
/**
 * These are preformatted block and its items, for in-line code, the editor simply reuse PlainSyntax component
 * for a code element to be a "CodeItem", it must be under a pre element and have the correct attrs
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FindWrappingElementWithinContainer, GetCaretContext, GetChildNodesTextContent, GetNextSiblings, GetRealChildren, MoveCaretIntoNode, MoveCaretToNode, TextNodeProcessor, } from "../Utils/Helpers";
//
export function Preblock(_a) {
    var { children, tagName, parentSetActivation, daemonHandle } = _a, otherProps = __rest(_a, ["children", "tagName", "parentSetActivation", "daemonHandle"]);
    const ContainerRef = useRef(null);
    function MoveCaret(direction) {
        console.log("Preformatted: Moving caret", direction);
        if (!ContainerRef.current)
            return;
        switch (direction) {
            case "pre":
                MoveCaretIntoNode(ContainerRef.current.previousElementSibling);
                break;
            case "aft":
                MoveCaretIntoNode(ContainerRef.current.nextElementSibling);
                break;
        }
    }
    function AddEmptyLine(direction) {
        if (!ContainerRef.current)
            return;
        const lineBreakElement = document.createElement("br");
        const NewLine = document.createElement("p");
        NewLine.appendChild(lineBreakElement);
        daemonHandle.AddToOperations({
            type: "ADD",
            newNode: NewLine,
            siblingNode: direction === "pre" ? ContainerRef.current : ContainerRef.current.nextSibling,
            parentXP: "//body"
        });
        daemonHandle.SetFutureCaret("NextLine");
        daemonHandle.SyncNow();
    }
    return React.createElement(tagName, Object.assign({ ref: ContainerRef, className: "pre-block" }, otherProps), cloneChildrenWithProps(children, { "parentMoveCaret": MoveCaret, "parentAddLine": AddEmptyLine }));
}
// Only handle code blocks, inline codes are PlainSyntax component
export function CodeItem(_a) {
    var { children, parentAddLine, parentMoveCaret, tagName, daemonHandle } = _a, otherProps = __rest(_a, ["children", "parentAddLine", "parentMoveCaret", "tagName", "daemonHandle"]);
    const [SetActivation] = useState(() => {
        return ComponentActivation;
    }); // the Meta state, called by parent via dom fiber
    const [isEditing, setIsEditing] = useState(false);
    const CodeElementRef = useRef(null);
    const SyntaxBlockFront = useRef(null);
    const SyntaxBlockRear = useRef(null);
    const SyntaxFillerFront = useRef(null);
    const SyntaxFillerRear = useRef(null);
    const TextBlocksMapRef = useRef(new Map()); // all possible text blocks under the code element
    const CodeLangTextRef = useRef(""); // the "language" that displayed after ```
    const ElementOBRef = useRef(null);
    // Added by the unified plugin
    const syntaxData = otherProps['data-md-syntax'] || '';
    function ComponentActivation(state) {
        var _a, _b, _c, _d;
        const componentHandlers = {
            "enter": EnterKeyHandler,
            "backspaceOverride": BackspaceHandler,
            "delOverride": DelKeyHandler,
            element: CodeElementRef.current
        };
        if (!state) {
            (_a = ElementOBRef.current) === null || _a === void 0 ? void 0 : _a.takeRecords();
            (_b = ElementOBRef.current) === null || _b === void 0 ? void 0 : _b.disconnect();
            ElementOBRef.current = null;
            if (CodeElementRef.current && CodeElementRef.current.textContent
                && CodeElementRef.current.parentNode && CodeElementRef.current.parentNode.nodeName.toLowerCase() === 'pre') {
                const NewCodeContent = (_c = CompileAllCodeText()) === null || _c === void 0 ? void 0 : _c.replace(/\u00A0/g, '');
                if (!NewCodeContent)
                    return componentHandlers;
                UpdateCodeElement(NewCodeContent);
            }
        }
        if (state) {
            daemonHandle.SyncNow();
            if (typeof MutationObserver) {
                ElementOBRef.current = new MutationObserver(ObserverHandler);
                CodeElementRef.current && ((_d = ElementOBRef.current) === null || _d === void 0 ? void 0 : _d.observe(CodeElementRef.current, {
                    childList: true,
                    subtree: true
                }));
            }
        }
        setIsEditing(state);
        return componentHandlers;
    }
    function ObserverHandler(mutationList) {
        mutationList.forEach((Record) => {
            if (!Record.removedNodes.length)
                return;
            Record.removedNodes.forEach((Node) => {
                var _a;
                if (TextBlocksMapRef.current.get(Node)
                    || Node === SyntaxFillerFront.current || Node === SyntaxFillerRear.current
                    || Node === SyntaxBlockFront.current || Node === SyntaxBlockRear.current) {
                    if (CodeElementRef.current && CodeElementRef.current.textContent
                        && CodeElementRef.current.parentNode && CodeElementRef.current.parentNode.nodeName.toLowerCase() === 'pre') {
                        const NewCodeContent = (_a = CompileAllCodeText()) === null || _a === void 0 ? void 0 : _a.replace('\u00A0', '');
                        if (NewCodeContent)
                            UpdateCodeElement(NewCodeContent);
                    }
                }
            });
        });
    }
    function CompileAllCodeText() {
        if (!CodeElementRef.current)
            return;
        let elementWalker = document.createTreeWalker(CodeElementRef.current, NodeFilter.SHOW_TEXT);
        let node;
        let textContent = '';
        let syntaxDataCount = 0;
        while (node = elementWalker.nextNode()) {
            if (syntaxDataCount === 2)
                break; //there shouldn't be any content after the second part of syntax, trim them off if present
            if (node.textContent === syntaxData)
                syntaxDataCount += 1;
            if (node.textContent === syntaxData && syntaxDataCount > 1) // otherwise the trailing syntaxData would become part of the content
                textContent += ("\n" + node.textContent);
            else
                textContent += node.textContent;
        }
        return textContent.trim();
    }
    function UpdateCodeElement(NewCodeContent) {
        var _a;
        if (!CodeElementRef.current || !CodeElementRef.current.parentNode)
            return;
        let ReplacementNode;
        // NOTE: converter's quirk, element will still be converted even if the ending half of the syntax is missing
        // NOTE: due to the particularity of the pre element(can contain syntax that should be converted to element),
        // only send to convert if only the result will still be a pre
        if (NewCodeContent.startsWith(syntaxData) && NewCodeContent.endsWith(syntaxData) && NewCodeContent !== syntaxData) {
            const textNodeResult = TextNodeProcessor(NewCodeContent);
            ReplacementNode = (textNodeResult === null || textNodeResult === void 0 ? void 0 : textNodeResult.length) ? textNodeResult[0] : null;
        }
        else {
            ReplacementNode = document.createElement('p');
            const textNode = document.createTextNode(GetChildNodesTextContent((_a = CodeElementRef.current) === null || _a === void 0 ? void 0 : _a.childNodes));
            ReplacementNode.appendChild(textNode);
        }
        if (ReplacementNode) {
            daemonHandle.AddToOperations({
                type: "REPLACE",
                targetNode: CodeElementRef.current.parentNode,
                newNode: ReplacementNode //first result node only
            });
            daemonHandle.SyncNow();
        }
    }
    // The del and backspace handlers are complete overrides
    function BackspaceHandler(ev) {
        var _a;
        ev.stopImmediatePropagation();
        let { PrecedingText, CurrentSelection, CurrentAnchorNode } = GetCaretContext();
        const PrevSibling = GetPrevValidSibling(CurrentAnchorNode);
        // when caret at the very beginning of the front syntax span, will remove the pre if unhandled.
        if (PrecedingText === '' && !PrevSibling) {
            ev.preventDefault();
            parentMoveCaret("pre");
        }
        // about to "merge" to syntax block, halted.
        if (PrecedingText === ""
            && (PrevSibling === SyntaxBlockFront.current || PrevSibling === SyntaxBlockRear.current)
            && TextBlocksMapRef.current.get(CurrentAnchorNode)) {
            ev.preventDefault();
            MoveCaretToNode(PrevSibling);
        }
        // This is needed to handle empty code element, backspace key may have trouble deleting the syntax element otherwise
        if (CurrentAnchorNode.nodeType === Node.TEXT_NODE && CurrentAnchorNode.textContent === '\n') {
            const NearestWrapper = FindWrappingElementWithinContainer(CurrentAnchorNode, CodeElementRef.current);
            if (NearestWrapper === SyntaxBlockFront.current || NearestWrapper === SyntaxBlockRear.current) {
                // "simulate" the delete from user so that the OB's api can be fired
                (_a = CodeElementRef.current) === null || _a === void 0 ? void 0 : _a.removeChild(NearestWrapper);
            }
        }
        // Likely backspacing in the  rear syntax block
        if ((CurrentSelection === null || CurrentSelection === void 0 ? void 0 : CurrentSelection.anchorOffset) === 0 && PrevSibling && TextBlocksMapRef.current.get(PrevSibling) && (CurrentSelection === null || CurrentSelection === void 0 ? void 0 : CurrentSelection.isCollapsed)) {
            ev.preventDefault();
            let offset = PrevSibling.textContent ? PrevSibling.textContent.length - 1 : 0;
            MoveCaretToNode(PrevSibling, offset);
        }
    }
    function DelKeyHandler(ev) {
        ev.stopImmediatePropagation();
        let { TextAfterSelection, CurrentSelection, CurrentAnchorNode } = GetCaretContext();
        if (!CurrentAnchorNode || !CodeElementRef.current || !CurrentSelection)
            return;
        const elementWithin = FindWrappingElementWithinContainer(CurrentAnchorNode, CodeElementRef.current);
        if (!elementWithin)
            return; //type narrowing, very unlikely
        const followingElements = GetNextSiblings(CurrentAnchorNode);
        // about to "merge" to the syntax block, move caret to the block
        if (followingElements[0] === SyntaxBlockFront.current || followingElements[0] === SyntaxBlockRear.current) {
            ev.preventDefault();
            MoveCaretToNode(followingElements[0]);
        }
        // Handling trailing delete, in syntax block
        const bCaretInSyntaxBlocks = elementWithin === SyntaxBlockRear.current || elementWithin === SyntaxBlockFront.current;
        if (bCaretInSyntaxBlocks) {
            const blockFollowingElements = GetNextSiblings(elementWithin);
            // caret on the syntax block itself, likely due to caret on the rear block that doesn't come with a text node
            if (CurrentAnchorNode.nodeType !== Node.TEXT_NODE && (CurrentSelection.anchorOffset && (CurrentSelection === null || CurrentSelection === void 0 ? void 0 : CurrentSelection.anchorOffset) > 0)) {
                ev.preventDefault();
                parentMoveCaret("aft");
                return;
            }
            // likely when editing the language for code element, or user added extra elements
            if (TextAfterSelection === '') {
                ev.preventDefault();
                if (blockFollowingElements.length)
                    MoveCaretToNode(blockFollowingElements[0]);
                else
                    parentMoveCaret("aft");
                return;
            }
        }
    }
    function EnterKeyHandler(ev) {
        ev.stopPropagation();
        let { TextAfterSelection, CurrentSelection, CurrentAnchorNode } = GetCaretContext();
        if (!CurrentAnchorNode || !CodeElementRef.current || !CurrentSelection)
            return;
        const elementWithin = FindWrappingElementWithinContainer(CurrentAnchorNode, CodeElementRef.current);
        if (!elementWithin)
            return; //type narrowing, very unlikely
        const bCaretInSyntaxBlocks = elementWithin === SyntaxBlockRear.current || elementWithin === SyntaxBlockFront.current;
        // similar to del, moving caret but also add new line as pre element level sibling
        if (bCaretInSyntaxBlocks) {
            ev.preventDefault();
            const blockFollowingElements = GetNextSiblings(elementWithin);
            // caret on the syntax block itself, likely due to caret on the rear block that doesn't come with a text node
            if (CurrentAnchorNode.nodeType !== Node.TEXT_NODE && (CurrentSelection.anchorOffset && (CurrentSelection === null || CurrentSelection === void 0 ? void 0 : CurrentSelection.anchorOffset) > 0)) {
                const blockChildren = GetRealChildren(elementWithin);
                if (blockChildren.length > 1)
                    MoveCaretToNode(blockChildren[1]);
                else
                    parentAddLine("aft");
                return;
            }
            // caret is on the beginning of the syntax filler
            if (CurrentAnchorNode === elementWithin && CurrentSelection.anchorOffset === 0) {
                if (!elementWithin.previousSibling || elementWithin.previousSibling.textContent === "\n")
                    parentAddLine("pre");
                else
                    MoveCaretToNode(elementWithin.previousSibling);
            }
            // likely when editing the language for code element, or user added extra elements
            if (TextAfterSelection === '') {
                if (blockFollowingElements.length)
                    MoveCaretToNode(blockFollowingElements[0]);
                else
                    parentAddLine("aft");
                return;
            }
            return;
        }
    }
    // keep track of code's language
    useLayoutEffect(() => {
        if (CodeElementRef.current) {
            const codeElementClassName = CodeElementRef.current.className;
            let CodeLang = null;
            if (codeElementClassName)
                CodeLang = codeElementClassName.split(' ').find(c => {
                    return codeElementClassName === null || codeElementClassName === void 0 ? void 0 : codeElementClassName.startsWith("language-");
                });
            if (!CodeLang)
                CodeLang = "";
            if (CodeLang && CodeLang.startsWith("language-"))
                CodeLang = CodeLang.split("language-")[1];
            CodeLangTextRef.current = CodeLang.trim();
        }
        return () => {
            CodeLangTextRef.current = '';
        };
    });
    // change contentEditable type to plaintext-only
    useEffect(() => {
        var _a;
        // GetEditingStateChild();
        // add code element itself to ignore
        if (CodeElementRef.current) {
            CodeElementRef.current.contentEditable = "plaintext-only";
            daemonHandle.AddToIgnore(CodeElementRef.current, "any");
        }
        if (SyntaxBlockFront.current) {
            SyntaxBlockFront.current.contentEditable = "true";
        }
        if (SyntaxBlockRear.current) {
            SyntaxBlockRear.current.contentEditable = "true";
        }
        // Add all child element to ignore, add all text nodes to TextBlocksMapRef
        if ((_a = CodeElementRef.current) === null || _a === void 0 ? void 0 : _a.childNodes) {
            daemonHandle.AddToIgnore(Array.from(CodeElementRef.current.childNodes), "any", true);
            Array.from(CodeElementRef.current.childNodes).forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    TextBlocksMapRef.current.set(child, true);
                }
            });
        }
        return () => {
            TextBlocksMapRef.current.clear();
        };
    });
    return React.createElement(tagName, Object.assign(Object.assign({}, otherProps), { className: `pre-block-code ${isEditing ? "is-active" : ""}`, ref: CodeElementRef }), [
        _jsxs("section", { className: `Text-Normal Whole-Line ${isEditing ? "" : 'Hide-It'}`, ref: SyntaxBlockFront, "data-is-generated": true, children: [_jsx("span", { "data-is-generated": true, contentEditable: false, ref: SyntaxFillerFront, children: syntaxData }), CodeLangTextRef.current === "" ? '\u00A0' : CodeLangTextRef.current, '\n'] }, 'SyntaxFront'),
        ...(Array.isArray(children) ? children : [children]),
        _jsx("section", { className: `Text-Normal Whole-Line ${isEditing ? "" : 'Hide-It'}`, ref: SyntaxBlockRear, "data-is-generated": true, children: _jsx("span", { "data-is-generated": true, contentEditable: false, ref: SyntaxFillerRear, children: syntaxData }) }, 'SyntaxRear'),
    ]);
}
// Component specific, add more props to children
function cloneChildrenWithProps(children, newProps) {
    return React.Children.map(children, (child) => {
        // If child isn't a valid React Element or null, return it without any modification
        if (!React.isValidElement(child))
            return child;
        return React.cloneElement(child, newProps);
    });
}
// Used in backspace handling
function GetPrevValidSibling(node) {
    let current = node;
    let sibling = null;
    while (current) {
        sibling = current.previousSibling;
        if (!sibling)
            break;
        if (sibling.nodeType === Node.TEXT_NODE && sibling.textContent !== '\n')
            break;
        if (sibling.nodeType === Node.ELEMENT_NODE)
            break;
        current = sibling;
    }
    return sibling;
}
