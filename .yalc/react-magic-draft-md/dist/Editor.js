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
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { HTML2MD, HTML2ReactSnyc, HTMLCleanUP, MD2HTML } from "./Utils/Conversion";
import useEditorDaemon, { ParagraphTest } from "./hooks/useEditorDaemon";
import "./Editor.css";
// helper
import { TextNodeProcessor, FindWrappingElementWithinContainer, GetCaretContext, MoveCaretIntoNode, GetNextSiblings, MoveCaretToNode } from "./Utils/Helpers";
// Editor Components
import Paragraph from './Editor_Parts/Paragraph';
import PlainSyntax from "./Editor_Parts/PlainSyntax";
import Links from "./Editor_Parts/Links";
import { Blockquote, QuoteItem } from "./Editor_Parts/Blockquote";
import { ListContainer, ListItem } from "./Editor_Parts/List";
import { CodeItem, Preblock } from "./Editor_Parts/Preformatted";
import SpecialLink from "./Editor_Parts/SpecialLink";
const AutoCompleteSymbols = /([*~`"(\[{])/;
const AutoCompletePairsMap = new Map([
    ["[", "]"],
    ["(", ")"],
    ["{", "}"]
]);
function EditorActual({ SourceData }, ref) {
    // const [sourceMD, setSourceMD] = useState<string>(() => {
    //     SourceData = SourceData || "";
    //     return SourceData;
    // });
    const EditorElementRef = useRef(null);
    const EditorSourceStringRef = useRef('');
    const EditorSourceDOCRef = useRef(null);
    const EditorMaskRef = useRef(null);
    const [EditorComponent, setEditorComponent] = useState(null);
    // Cache of the last activated components
    const LastActivationCache = useRef([]);
    const LastActiveAnchor = useRef(null); //compare with this only works before page re-rendering
    // Subsequence reload
    function ReloadEditorContent() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!EditorSourceDOCRef.current)
                return;
            const bodyElement = EditorSourceDOCRef.current.documentElement.querySelector('body');
            if (!bodyElement)
                return;
            bodyElement.normalize();
            EditorSourceStringRef.current = String(bodyElement.innerHTML);
            const CleanedHTML = HTMLCleanUP(bodyElement.innerHTML);
            EditorSourceStringRef.current = String(CleanedHTML);
            const HTMLParser = new DOMParser();
            EditorSourceDOCRef.current = HTMLParser.parseFromString(String(CleanedHTML), "text/html");
            setEditorComponent(ConfigAndConvertToReact(EditorSourceStringRef.current));
        });
    }
    // FIXME: this structure is getting unwieldy, find a way to refactor.
    function ConfigAndConvertToReact(md2HTML) {
        // Map all possible text-containing tags to TextContainer component and therefore manage them.
        const TextNodesMappingConfig = ['p', 'span', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'code', 'pre', 'em', 'strong', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'br', 'img', 'del', 'input', 'hr']
            .reduce((acc, tagName) => {
            acc[tagName] = (props) => {
                // inline syntax
                if (props['data-md-syntax'] && props['data-md-inline']) {
                    if (props['data-link-to']) {
                        return _jsx(SpecialLink, Object.assign({}, props, { daemonHandle: DaemonHandle, tagName: tagName }));
                    }
                    //Containers
                    //Simple syntax
                    return _jsx(PlainSyntax, Object.assign({}, props, { daemonHandle: DaemonHandle, tagName: tagName }));
                }
                // Links
                if (props['data-md-link']) {
                    return _jsx(Links, Object.assign({}, props, { daemonHandle: DaemonHandle, tagName: tagName }));
                }
                // Block quote
                if (props['data-md-blockquote'] === 'true') {
                    return _jsx(Blockquote, Object.assign({}, props, { daemonHandle: DaemonHandle, tagName: tagName }));
                }
                if (props['data-md-quote-item'] === 'true') {
                    return _jsx(QuoteItem, Object.assign({}, props, { daemonHandle: DaemonHandle, tagName: tagName }));
                }
                // List and items
                if (props['data-md-list'] === 'true') {
                    return _jsx(ListContainer, Object.assign({}, props, { daemonHandle: DaemonHandle, tagName: tagName }));
                }
                if (props['data-md-list-item'] === 'true') {
                    return _jsx(ListItem, Object.assign({}, props, { daemonHandle: DaemonHandle, tagName: tagName }));
                }
                if (props['data-md-preformatted'] === 'true') {
                    return _jsx(Preblock, Object.assign({}, props, { daemonHandle: DaemonHandle, tagName: tagName }));
                }
                // Code and Code block
                // usually code blocks, supersede in-line codes
                if (props['data-md-pre-item'] === 'true' && props['data-md-code'] === 'true') {
                    return _jsx(CodeItem, Object.assign({}, props, { daemonHandle: DaemonHandle, tagName: tagName }));
                }
                // singular in-line code items
                if (props['data-md-code'] === 'true') {
                    return _jsx(PlainSyntax, Object.assign({}, props, { daemonHandle: DaemonHandle, tagName: tagName }));
                }
                // Paragraph and Headers
                if (props['data-md-paragraph'] || props['data-md-header']) {
                    // Header
                    if (props['data-md-header'] !== undefined) {
                        return _jsx(Paragraph, Object.assign({}, props, { isHeader: true, headerSyntax: props['data-md-header'], daemonHandle: DaemonHandle, tagName: tagName }));
                    }
                    // Normal P tags
                    return _jsx(Paragraph, Object.assign({}, props, { daemonHandle: DaemonHandle, tagName: tagName }));
                }
                return _jsx(CommonRenderer, Object.assign({}, props, { tagName: tagName }));
            };
            return acc;
        }, {});
        const componentOptions = Object.assign({}, TextNodesMappingConfig);
        return HTML2ReactSnyc(md2HTML, componentOptions).result;
    }
    // Will be called by the Daemon
    function MaskEditingArea() {
        var _a, _b;
        if (!EditorMaskRef.current || !EditorMaskRef.current.innerHTML)
            return;
        const editorInnerHTML = (_a = EditorElementRef.current) === null || _a === void 0 ? void 0 : _a.innerHTML;
        if (editorInnerHTML) {
            (_b = EditorElementRef.current) === null || _b === void 0 ? void 0 : _b.classList.add("No-Vis");
            EditorMaskRef.current.innerHTML = editorInnerHTML;
            EditorMaskRef.current.classList.remove("Hide-It");
        }
        // return the Unmask function for the Daemon
        return () => {
            if (!EditorElementRef.current || !EditorMaskRef.current)
                return;
            EditorElementRef.current.classList.remove("No-Vis");
            EditorMaskRef.current.classList.add('Hide-It');
            EditorMaskRef.current.innerHTML = " ";
        };
    }
    // function that extract HTML content from editor, will be called by parent component with forward ref
    function ExtractMD() {
        return __awaiter(this, void 0, void 0, function* () {
            const ConvertedMarkdown = yield HTML2MD(EditorSourceStringRef.current);
            return String(ConvertedMarkdown);
        });
    }
    // expose the extraction to parent
    useImperativeHandle(ref, () => ({
        ExtractMD
    }));
    // Editor level selection status monitor
    const ComponentActivationSwitch = () => {
        var _a;
        const selection = window.getSelection();
        if (!selection)
            return;
        // Must be an element of the current editor
        if (!((_a = EditorElementRef.current) === null || _a === void 0 ? void 0 : _a.contains(selection === null || selection === void 0 ? void 0 : selection.anchorNode)))
            return;
        let ActiveComponentsStack = LastActivationCache.current;
        if (!ActiveComponentsStack)
            return;
        // The top most active component, used for comparing
        const TopActiveComponent = ActiveComponentsStack[ActiveComponentsStack.length - 1];
        // Must not contains multiple elements
        if (!selection.isCollapsed) {
            if (selection.anchorNode === selection.focusNode)
                return;
            // No active component
            if (!ActiveComponentsStack.length)
                return;
            if (!TopActiveComponent || typeof TopActiveComponent.func !== 'function')
                return;
            // Switch off last activation if drag selection passed the last element
            const { compFiber: endPointFiber } = FindActiveEditorComponentFiber(selection.focusNode);
            if (endPointFiber && endPointFiber !== TopActiveComponent.fiber) {
                let ActiveComponent;
                while (ActiveComponent = ActiveComponentsStack.pop()) {
                    if (typeof ActiveComponent.func !== 'function')
                        continue;
                    ActiveComponent.func(false);
                }
            }
            return;
        }
        if (LastActiveAnchor.current === selection.anchorNode)
            return;
        // refresh the cache
        LastActiveAnchor.current = selection.anchorNode;
        // retrieve the component, set the editing state
        const { compFiber: ActiveComponentFiber, parentFibers } = FindActiveEditorComponentFiber(selection.anchorNode);
        // FIXME: This is VERY VERY VERY HACKY
        // right now the logic is - for a editor component, the very first state need to be a function that handles all logic for "mark as active"
        // with the old class components, after gettng the components from dom, you can get the "stateNode" and actually call the setState() from there
        if (!ActiveComponentFiber)
            return;
        if (TopActiveComponent && (TopActiveComponent.fiber === ActiveComponentFiber))
            return;
        // console.log("Active fiber ", ActiveComponentFiber, " ", selection.anchorNode);
        // Switch off all currently activated
        let ActiveComponent;
        while (ActiveComponent = ActiveComponentsStack.pop()) {
            if (typeof ActiveComponent.func !== 'function')
                continue;
            ActiveComponent.func(false);
        }
        let keyPathFull = '';
        let keyLast = null;
        // switch on the new ones, parent components first
        parentFibers.forEach((fiber) => {
            keyPathFull += fiber.key || "";
            if (fiber.key && keyLast === null)
                keyLast = fiber.key; //store the key so that it can be used latter
            let ID = fiber.key;
            if (!fiber.key && keyLast) {
                ID = keyLast;
                keyLast = null;
            }
            if (!fiber.memoizedState || typeof fiber.memoizedState.memoizedState !== "function")
                return;
            const CachedItem = {
                fiber: fiber,
                func: fiber.memoizedState.memoizedState,
                return: fiber.memoizedState.memoizedState(true),
                id: ID
            };
            ActiveComponentsStack.push(CachedItem);
        });
        // the top-level component
        if (ActiveComponentFiber.memoizedState && typeof ActiveComponentFiber.memoizedState.memoizedState === "function") {
            ActiveComponentsStack.push({
                fiber: ActiveComponentFiber,
                func: ActiveComponentFiber.memoizedState.memoizedState,
                return: ActiveComponentFiber.memoizedState.memoizedState(true),
                id: ActiveComponentFiber.key ? ActiveComponentFiber.key : keyLast
            });
        }
        // console.log("switching finished:", ActiveComponentsStack)
    };
    // Functionalities such as wrapping selected text with certain symbols or brackets
    function AutocompleteHandler(KeyboardInput, ev) {
        let { PrecedingText, SelectedText, RemainingText, TextAfterSelection, CurrentSelection, CurrentAnchorNode } = GetCaretContext();
        if (!CurrentAnchorNode || !CurrentSelection)
            return;
        const NearestContainer = FindWrappingElementWithinContainer(CurrentAnchorNode, EditorElementRef.current);
        if (!NearestContainer)
            return;
        // TODO: could cause non-responsiveness, need more testing
        if (CurrentAnchorNode.nodeType !== Node.TEXT_NODE && CurrentAnchorNode !== NearestContainer)
            return;
        // Prep the symbol,"pair" for parentheses or brackets
        let KeyboardInputPair = AutoCompletePairsMap.get(KeyboardInput);
        if (!KeyboardInputPair)
            KeyboardInputPair = KeyboardInput;
        if (CurrentSelection.isCollapsed || !SelectedText)
            return;
        // The "wrapping" functionality only handles selected text to save confusion
        // Wrap the selected content
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        ev.preventDefault();
        let OldRange = {
            startOffset: CurrentSelection.getRangeAt(0).startOffset || 0,
            endOffset: CurrentSelection.getRangeAt(0).endOffset || 0,
        };
        /**
         *  When double click to select text, the selection may include preceding or tailing whitespace,
         *  the extra ws will break the conversion. eg: *strong* is fine, but *strong * will not immediately convert to strong tag.
         *  in this case, remove the ws from selection, and then add them back in their original position
         */
        // Padding for whitespace that was removed
        let LeftPadding = '';
        let RightPadding = '';
        if (SelectedText.trim() !== SelectedText) {
            if (SelectedText.startsWith(" ")) {
                LeftPadding = " ";
                OldRange.startOffset += 1;
            }
            if (SelectedText.endsWith(" ")) {
                RightPadding = " ";
                OldRange.startOffset -= 1;
            }
        }
        CurrentAnchorNode.textContent = PrecedingText + LeftPadding + KeyboardInput + SelectedText.trim() + KeyboardInputPair;
        if (TextAfterSelection) {
            CurrentAnchorNode.textContent += (RightPadding + TextAfterSelection);
        }
        const selection = window.getSelection();
        if (!selection)
            return;
        let NewRange = document.createRange();
        try {
            NewRange.setStart(CurrentAnchorNode, OldRange.startOffset + KeyboardInput.length || 0);
            if (TextAfterSelection) {
                NewRange.setEnd(CurrentAnchorNode, OldRange.endOffset + KeyboardInputPair.length || 0);
            }
            else {
                NewRange.setEnd(CurrentAnchorNode, CurrentAnchorNode.textContent.length - KeyboardInputPair.length);
            }
            selection.removeAllRanges();
            selection.addRange(NewRange);
        }
        catch (e) {
            console.warn(e);
        }
        return;
    }
    // TODO: May not be needed, delete later
    function CheckForInputTriggers(KeyboardInput) {
        let { PrecedingText, SelectedText, RemainingText, TextAfterSelection, CurrentSelection, CurrentAnchorNode } = GetCaretContext();
        if (!CurrentAnchorNode || !CurrentSelection)
            return;
        const NearestContainer = FindWrappingElementWithinContainer(CurrentAnchorNode, EditorElementRef.current);
        if (!NearestContainer)
            return;
        const bContainerIsParagraph = NearestContainer.nodeName.toLowerCase() === 'p' && NearestContainer.parentNode === EditorElementRef.current;
        if (KeyboardInput === "`" && bContainerIsParagraph && NearestContainer.textContent === "``") {
            console.log("SYNCED");
            DaemonHandle.SyncNow();
        }
    }
    /**
     * Following are the logics to handle key presses
     * The idea is that these are the "generic" logic handling line breaking/joining, sometimes using only vanilla content editable logic.
     * if subcomponents need to have their own logic on these keys, they are injected via state function return and stored in "ActivationCallbacksRef.current"
     * when no special logic is present, the "generic" logic would run.
     */
    function EnterKeyHandler(ev) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            // Run the component spec handler if present
            // if the callback returns 'true', continue the editor's logic
            let LastComponentKey = null;
            let LatestCallbackReturn = undefined;
            let bComponentEnterUsed = false;
            let ActiveComponentsStack = LastActivationCache.current;
            if (!ActiveComponentsStack)
                return;
            // The top most active component, used for comparing
            let TopActiveComponent = ActiveComponentsStack[ActiveComponentsStack.length - 1];
            // Run "current component"'s enter key logic until there is none or encountered self again.
            // This is to deal with changed caret position and therefore changed active component after enter key.
            while (TopActiveComponent && typeof ((_a = TopActiveComponent.return) === null || _a === void 0 ? void 0 : _a.enter) === 'function' && (TopActiveComponent.id && TopActiveComponent.id !== LastComponentKey)) {
                bComponentEnterUsed = true;
                LastComponentKey = TopActiveComponent.id; //NOTE: this can be the key of the wrapping anonymous component
                console.log("Component Enter key ", LastComponentKey);
                LatestCallbackReturn = yield TopActiveComponent.return.enter(ev);
                TopActiveComponent = ActiveComponentsStack[ActiveComponentsStack.length - 1];
            }
            if (bComponentEnterUsed && LatestCallbackReturn !== true)
                return;
            // NOTE: Old implementation, this will only run the component enter key only once, no longer suited for the async/await structure.
            // if (typeof LastActivationCache.current.return?.enter === 'function') {
            //     console.log("Component Enter key")
            //     const CallbackReturn = await LastActivationCache.current.return?.enter(ev);
            //
            //     if (CallbackReturn !== true)
            //         return
            // }
            // run parent-level enter key handling
            // container-like parent usually have special handling for enter key, in case of multi-level component with those containers, this is acts as "failsafe"
            // starts from second to last element
            for (let i = ActiveComponentsStack.length - 2; i >= 0; i--) {
                const parentComponent = ActiveComponentsStack[i];
                if (typeof ((_b = parentComponent.return) === null || _b === void 0 ? void 0 : _b.enter) === 'function') {
                    console.log("Parent level Enter key ", parentComponent.id);
                    if (parentComponent.return.enter(ev) !== true)
                        return;
                }
            }
            ev.preventDefault();
            ev.stopPropagation();
            // Normal logic
            let { RemainingText, PrecedingText, CurrentSelection, CurrentAnchorNode } = GetCaretContext();
            if (!CurrentSelection || !CurrentAnchorNode)
                return;
            // Collapse selection, otherwise expanded selection may extend to the new line and cause weird behaviors.
            if (!CurrentSelection.isCollapsed)
                return CurrentSelection.collapseToEnd();
            if ((CurrentAnchorNode === null || CurrentAnchorNode === void 0 ? void 0 : CurrentAnchorNode.contentEditable) === 'false' || ((_c = CurrentAnchorNode.parentNode) === null || _c === void 0 ? void 0 : _c.contentEditable) === 'false' || CurrentAnchorNode.textContent === '\n') {
                console.warn("Enter Key Exception, not a valid node", CurrentAnchorNode);
                DaemonHandle.SetFutureCaret("NextElement");
                DaemonHandle.SyncNow();
                return;
            }
            let NearestContainer = FindWrappingElementWithinContainer(CurrentAnchorNode, EditorElementRef.current);
            if (!NearestContainer)
                return; //unlikely
            // Check if caret at an empty line
            const bEmptyLine = NearestContainer === CurrentAnchorNode || ((NearestContainer === null || NearestContainer === void 0 ? void 0 : NearestContainer.childNodes.length) === 1 && NearestContainer.childNodes[0].nodeName.toLowerCase() === 'br');
            // Empty line when caret landed on the p tag itself. the NearestContainer would be the p tag
            if (bEmptyLine && NearestContainer.firstChild) {
                RemainingText = '';
                PrecedingText = '';
                CurrentAnchorNode = NearestContainer.firstChild;
            }
            // Caret usually land on a text node, get the wrapping element
            let Current_ElementNode = FindWrappingElementWithinContainer(CurrentAnchorNode, NearestContainer);
            if (!Current_ElementNode)
                return; //unlikly
            // if landed on a non-editble content, move caret to maintain the smoothness
            if (Current_ElementNode.contentEditable === 'false') {
                const followingElements = GetNextSiblings(Current_ElementNode);
                const moveToNode = followingElements.find(element => {
                    return element.contentEditable !== 'false';
                });
                MoveCaretToNode(moveToNode);
                return;
            }
            // Breaking in an empty line
            if (bEmptyLine && CurrentAnchorNode.nodeName.toLowerCase() === 'br') {
                console.log('Breaking - Empty line');
                const NewLine = document.createElement("p"); // The new line
                const lineBreakElement = document.createElement("br");
                NewLine.appendChild(lineBreakElement);
                DaemonHandle.AddToOperations({
                    type: "ADD",
                    newNode: NewLine,
                    siblingNode: NearestContainer,
                    parentXP: "//body"
                });
                DaemonHandle.SetFutureCaret('NextLine');
                DaemonHandle.SyncNow();
                return;
            }
            const Range = CurrentSelection.getRangeAt(0);
            const bNoValidPreSiblings = !Current_ElementNode.previousSibling
                || Current_ElementNode.previousSibling.contentEditable === 'false' && !Current_ElementNode.previousSibling.previousSibling;
            // Breaking at the very beginning of the line
            if (bNoValidPreSiblings && Range.startOffset === 0) {
                console.log('Breaking - First element');
                // A new line with only a br
                const lineBreakElement = document.createElement("br");
                const NewLine = document.createElement("p"); // The new line
                NewLine.appendChild(lineBreakElement);
                DaemonHandle.AddToOperations({
                    type: "ADD",
                    newNode: NewLine,
                    siblingNode: NearestContainer,
                    parentXP: "//body"
                });
                DaemonHandle.SetFutureCaret("NextLine");
                DaemonHandle.SyncNow();
                return;
            }
            let FollowingNodes = GetNextSiblings(Current_ElementNode);
            // Breaking anywhere in the middle of the line
            if (RemainingText !== '' || FollowingNodes.length > 1 || (FollowingNodes.length === 1 && FollowingNodes[0].textContent !== '\n')) {
                console.log("Breaking - Mid line");
                // Exception, when caret is on the element tag itself, and didn't fit the previous cases (happens on PlainSyntax primarily)
                if (CurrentAnchorNode.nodeType !== Node.TEXT_NODE) {
                    console.warn("Enter Key Exception, move caret to", NearestContainer);
                    MoveCaretIntoNode(NearestContainer);
                    return;
                }
                let anchorNodeClone = CurrentAnchorNode.cloneNode(true);
                if (anchorNodeClone.textContent !== null)
                    anchorNodeClone.textContent = RemainingText;
                const NewLine = document.createElement("p"); // The new line
                NewLine.appendChild(anchorNodeClone);
                // Add the following elements in right order
                FollowingNodes.forEach(Node => {
                    NewLine.appendChild(Node.cloneNode(true));
                });
                // Delete the elements in the old line, need to remove the last one first otherwise the xpath will not be correct
                FollowingNodes.slice().reverse().forEach(Node => {
                    DaemonHandle.AddToOperations({
                        type: "REMOVE",
                        targetNode: Node,
                    });
                });
                // Clean up the old line
                DaemonHandle.AddToOperations({
                    type: "TEXT",
                    targetNode: CurrentAnchorNode,
                    nodeText: PrecedingText
                });
                DaemonHandle.AddToOperations({
                    type: "ADD",
                    newNode: NewLine,
                    siblingNode: NearestContainer === null || NearestContainer === void 0 ? void 0 : NearestContainer.nextSibling,
                    parentXP: "//body"
                });
                DaemonHandle.SetFutureCaret('NextLine');
                DaemonHandle.SyncNow();
                return;
            }
            // Breaking at the very end of the line
            console.log("Breaking - End of line");
            const lineBreakElement = document.createElement("br");
            const NewLine = document.createElement("p");
            NewLine.appendChild(lineBreakElement);
            DaemonHandle.AddToOperations({
                type: "ADD",
                newNode: NewLine,
                siblingNode: NearestContainer === null || NearestContainer === void 0 ? void 0 : NearestContainer.nextSibling,
                parentXP: "//body"
            });
            DaemonHandle.SetFutureCaret("NextLine");
            DaemonHandle.SyncNow();
        });
    }
    function BackSpaceKeyHandler(ev) {
        var _a, _b, _c, _d, _e, _f;
        const ActiveComponentsStack = LastActivationCache.current;
        const TopActiveComponent = ActiveComponentsStack[ActiveComponentsStack.length - 1];
        if (TopActiveComponent && typeof ((_a = TopActiveComponent.return) === null || _a === void 0 ? void 0 : _a.backspaceOverride) === 'function') {
            console.log("Backspace: Component Spec Override");
            return (_b = TopActiveComponent.return) === null || _b === void 0 ? void 0 : _b.backspaceOverride(ev);
        }
        // basically a reverse of the "delete", but with key differences on "normal join line"
        let { PrecedingText, CurrentSelection, CurrentAnchorNode } = GetCaretContext();
        if (!CurrentAnchorNode)
            return;
        const NearestContainer = FindWrappingElementWithinContainer(CurrentAnchorNode, EditorElementRef.current);
        if (!NearestContainer)
            return;
        if (NearestContainer === CurrentAnchorNode) {
            CurrentAnchorNode = NearestContainer.firstChild;
            if (!CurrentAnchorNode) {
                ev.preventDefault();
                ev.stopPropagation();
                return;
            }
            // This method is less responsive
            // ev.preventDefault();
            // ev.stopPropagation();
            // MoveCaretToNode(NearestContainer.firstChild, 0);
            // return;
        }
        const bPrecedingValid = PrecedingText.trim() !== '' || (CurrentAnchorNode.previousSibling && CurrentAnchorNode.previousSibling.textContent !== '\n');
        const bAnchorIsTextNode = CurrentAnchorNode.nodeType === Node.TEXT_NODE;
        // Run the normal key press on in-line editing
        if (bPrecedingValid && bAnchorIsTextNode)
            return;
        if (CurrentSelection && !CurrentSelection.isCollapsed)
            return;
        // Handle empty container type
        if (CurrentAnchorNode.childNodes.length) {
            const bHaveOtherElement = Array.from(CurrentAnchorNode.childNodes).some((childNode) => {
                if (childNode.nodeType === Node.TEXT_NODE && childNode.textContent !== '\n')
                    return true;
                if (childNode.nodeType === Node.ELEMENT_NODE && (!childNode.hasAttribute("data-is-generated") && childNode.contentEditable !== 'false'))
                    return true;
                return false;
            });
            if (!bHaveOtherElement)
                console.log("Backspace: container empty, removing");
            if (!bHaveOtherElement)
                return;
        }
        // line joining
        ev.preventDefault();
        ev.stopPropagation();
        let previousElementSibling = NearestContainer === null || NearestContainer === void 0 ? void 0 : NearestContainer.previousElementSibling; //nextsibling could be a "\n"
        if (!previousElementSibling)
            return; //No more lines following
        // when there is still content that could be deleted, but caret lands on the wrong element
        // FIXME: may be buggy, need more testing
        if (CurrentAnchorNode.previousSibling && CurrentAnchorNode.previousSibling !== previousElementSibling) {
            // console.log(CurrentAnchorNode.previousSibling, NearestContainer)
            if (previousElementSibling) {
                console.log("Backspace: Invalid Caret, moving Caret to ", previousElementSibling);
                MoveCaretToLastEOL(window.getSelection(), EditorElementRef.current);
            }
            else {
                console.log("Backspace: Invalid Caret, moving Caret to ", CurrentAnchorNode);
                MoveCaretIntoNode(CurrentAnchorNode);
            }
            return;
        }
        // Moves caret or delete non-editable
        let anchorParent = CurrentAnchorNode.parentNode;
        if (CurrentAnchorNode.parentNode && anchorParent !== NearestContainer) {
            const nearestSibling = GetPrevAvailableSibling(CurrentAnchorNode, NearestContainer);
            if (nearestSibling) {
                if (nearestSibling.contentEditable === 'false' && nearestSibling.parentNode) {
                    console.log("Backspace: removing non-editable child ", nearestSibling, " from ", nearestSibling.parentNode);
                    nearestSibling.parentNode.removeChild(nearestSibling);
                    return;
                }
                console.log("Backspace: Moving Caret to ", nearestSibling);
                MoveCaretToNode(nearestSibling, nearestSibling.textContent ? nearestSibling.textContent.length : 0);
                return;
            }
        }
        const bSelfIsEmptyLine = (NearestContainer === null || NearestContainer === void 0 ? void 0 : NearestContainer.childNodes.length) === 1 && ((_c = NearestContainer === null || NearestContainer === void 0 ? void 0 : NearestContainer.firstChild) === null || _c === void 0 ? void 0 : _c.nodeName.toLowerCase()) === 'br';
        const bPrevLineEmpty = (previousElementSibling === null || previousElementSibling === void 0 ? void 0 : previousElementSibling.childNodes.length) === 1 && ((_d = previousElementSibling === null || previousElementSibling === void 0 ? void 0 : previousElementSibling.firstChild) === null || _d === void 0 ? void 0 : _d.nodeName.toLowerCase()) === 'br';
        // Backspace previous empty lines
        if (bPrevLineEmpty) {
            console.log("Backspace: Empty Line");
            DaemonHandle.AddToOperations({
                type: "REMOVE",
                targetNode: previousElementSibling
            });
            MoveCaretToNode(previousElementSibling);
            DaemonHandle.SyncNow();
            return;
        }
        // self is empty line
        if (bSelfIsEmptyLine) {
            console.log("Backspace: Self Empty Line");
            DaemonHandle.AddToOperations({
                type: "REMOVE",
                targetNode: NearestContainer
            });
            MoveCaretToLastEOL(window.getSelection(), EditorElementRef.current);
            DaemonHandle.SyncNow();
            return;
        }
        // Run the component spec handler if present
        if (TopActiveComponent && typeof ((_e = TopActiveComponent.return) === null || _e === void 0 ? void 0 : _e.backspaceJoining) === 'function') {
            console.log("Backspace: Component line joining");
            if (((_f = TopActiveComponent.return) === null || _f === void 0 ? void 0 : _f.backspaceJoining(ev)) !== true)
                return;
        }
        // Dealing with container type of element
        if (previousElementSibling.nodeType === Node.ELEMENT_NODE && (previousElementSibling === null || previousElementSibling === void 0 ? void 0 : previousElementSibling.hasAttribute('data-md-container'))) {
            console.log("Backspace: Container Item");
            if (previousElementSibling.childElementCount > 1)
                DaemonHandle.AddToOperations({
                    type: "REMOVE",
                    targetNode: previousElementSibling.lastElementChild
                });
            else
                DaemonHandle.AddToOperations({
                    type: "REMOVE",
                    targetNode: previousElementSibling
                });
            DaemonHandle.SetFutureCaret('PrevLine');
            DaemonHandle.SyncNow();
            return;
        }
        // "Normal" joining lines
        console.log("Backspace: Line Join");
        let NewLine = previousElementSibling.cloneNode(true);
        NearestContainer.childNodes.forEach((ChildNode) => {
            NewLine.appendChild(ChildNode.cloneNode(true));
        });
        DaemonHandle.AddToOperations({
            type: "REMOVE",
            targetNode: NearestContainer,
        });
        DaemonHandle.AddToOperations({
            type: "REPLACE",
            targetNode: previousElementSibling,
            newNode: NewLine
        });
        MoveCaretToLastEOL(window.getSelection(), EditorElementRef.current);
        DaemonHandle.SyncNow();
    }
    function DelKeyHandler(ev) {
        var _a, _b, _c, _d;
        const ActiveComponentsStack = LastActivationCache.current;
        const TopActiveComponent = ActiveComponentsStack[ActiveComponentsStack.length - 1];
        if (TopActiveComponent && typeof ((_a = TopActiveComponent.return) === null || _a === void 0 ? void 0 : _a.delOverride) === 'function') {
            console.log("Del: Component Spec Override");
            return TopActiveComponent.return.delOverride(ev);
        }
        let { RemainingText, CurrentSelection, CurrentAnchorNode } = GetCaretContext();
        if (!CurrentAnchorNode)
            return;
        let NearestContainer = FindWrappingElementWithinContainer(CurrentAnchorNode, EditorElementRef.current);
        if (!NearestContainer)
            return;
        const bCaretOnContainer = CurrentAnchorNode === NearestContainer;
        const bHasContentToDelete = RemainingText.trim() !== '' || (CurrentAnchorNode.nextSibling && CurrentAnchorNode.nextSibling.textContent !== '\n');
        const bAnchorIsTextNode = CurrentAnchorNode.nodeType === Node.TEXT_NODE;
        // Mainly dealing with li elements, after placing the caret on "the dash", anchor will be on the li itself due to the leading span is non-editable,
        // thus this is needed to remove the span so that the operation seemed more natural
        //TODO: May be buggy, need more testing
        if (ParagraphTest.test(CurrentAnchorNode.nodeName)) {
            if (CurrentAnchorNode.childNodes && CurrentAnchorNode.childNodes[0].contentEditable === 'false')
                return CurrentAnchorNode.removeChild(CurrentAnchorNode.childNodes[0]);
            return MoveCaretIntoNode(CurrentAnchorNode);
        }
        // Expanded selection, use browser defualt logic
        if (CurrentSelection && !CurrentSelection.isCollapsed)
            return;
        //
        if (!bCaretOnContainer && bHasContentToDelete && bAnchorIsTextNode)
            return; // NOTE: when deleting text, default browser logic behaved strangely and will see the caret moving back and forth
        // Handle empty container type
        if (CurrentAnchorNode.childNodes.length) {
            const bHaveOtherElement = Array.from(CurrentAnchorNode.childNodes).some((childNode) => {
                if (childNode.nodeType === Node.TEXT_NODE && childNode.textContent !== '\n')
                    return true;
                if (childNode.nodeType === Node.ELEMENT_NODE && (!childNode.hasAttribute("data-is-generated") && childNode.contentEditable !== 'false'))
                    return true;
                return false;
            });
            if (!bHaveOtherElement)
                console.log("Del: container empty, removing");
            if (!bHaveOtherElement)
                return;
        }
        // line joining
        ev.preventDefault();
        ev.stopPropagation();
        // TODO: NOTE: this is an override on editing text, so far only needed for del key
        // TODO: Incomplete,browser's logic cause caret to move back and fourth, but re-implementing involves handling too many edge cases, deemed not worth it, saving for reference.
        // if (!bCaretOnContainer && bHasContentToDelete && bAnchorIsTextNode) {
        //     if (RemainingText !== '') {
        //         CurrentAnchorNode.deleteData(CurrentSelection?.anchorOffset, 1);
        //         return;
        //     }
        //     let nextSibling = CurrentAnchorNode.nextSibling;
        //     if (!nextSibling) return;
        //     // Delete the first character of the next text node
        //     if (nextSibling.nodeType === Node.TEXT_NODE) {
        //         (nextSibling as Text).deleteData(0, 1);
        //         MoveCaretToNode(nextSibling);
        //     }
        //     if (nextSibling.nodeType === Node.ELEMENT_NODE) {
        //         let textNode = GetFirstTextNode(nextSibling);
        //         if (!textNode) return MoveCaretIntoNode(textNode);
        //         (textNode as Text).deleteData(0, 1);
        //         MoveCaretToNode(textNode);
        //     }
        //     return;
        // }
        let nextElementSibling = NearestContainer === null || NearestContainer === void 0 ? void 0 : NearestContainer.nextElementSibling; //nextsibling could be a "\n"
        if (!nextElementSibling)
            return; //No more lines following
        // same as back space, when there is still content that could be deleted, but caret lands on the wrong element
        if (CurrentAnchorNode.nextSibling && CurrentAnchorNode.nextSibling !== nextElementSibling) {
            console.log("Del: Invalid Caret, moving Caret to ", CurrentAnchorNode);
            MoveCaretIntoNode(CurrentAnchorNode);
            return;
        }
        // Move the caret, mainly dealing with nested node structure with their own text nodes
        let anchorParent = CurrentAnchorNode.parentNode;
        if (CurrentAnchorNode.parentNode && anchorParent !== NearestContainer) {
            const nearestSibling = GetNextAvailableSibling(CurrentAnchorNode, NearestContainer);
            if (nearestSibling) {
                if (nearestSibling.contentEditable === 'false' && nearestSibling.parentNode) {
                    console.log("Del: removing non-editable child ", nearestSibling, " from ", nearestSibling.parentNode);
                    nearestSibling.parentNode.removeChild(nearestSibling);
                    return;
                }
                console.log("Del: Moving Caret to ", nearestSibling);
                MoveCaretToNode(nearestSibling, 0);
                return;
            }
        }
        // Line joining logics
        // deleting empty lines
        if ((nextElementSibling === null || nextElementSibling === void 0 ? void 0 : nextElementSibling.childNodes.length) === 1 && ((_b = nextElementSibling === null || nextElementSibling === void 0 ? void 0 : nextElementSibling.firstChild) === null || _b === void 0 ? void 0 : _b.nodeName.toLowerCase()) === 'br') {
            console.log("Del:Delete Empty Line");
            DaemonHandle.AddToOperations({
                type: "REMOVE",
                targetNode: nextElementSibling
            });
            DaemonHandle.SyncNow();
            return;
        }
        // self is empty line
        if ((NearestContainer === null || NearestContainer === void 0 ? void 0 : NearestContainer.childNodes.length) === 1 && ((_c = NearestContainer === null || NearestContainer === void 0 ? void 0 : NearestContainer.firstChild) === null || _c === void 0 ? void 0 : _c.nodeName.toLowerCase()) === 'br') {
            console.log("Del:Self Empty Line");
            DaemonHandle.AddToOperations({
                type: "REMOVE",
                targetNode: NearestContainer
            });
            DaemonHandle.SyncNow();
            return;
        }
        // Run the component spec handler if present
        if (TopActiveComponent && typeof ((_d = TopActiveComponent.return) === null || _d === void 0 ? void 0 : _d.delJoining) === 'function') {
            console.log("Del: Component Spec line joining");
            if (TopActiveComponent.return.delJoining(ev) !== true)
                return;
        }
        // Dealing with container type of element
        if (nextElementSibling.nodeType === Node.ELEMENT_NODE && (nextElementSibling === null || nextElementSibling === void 0 ? void 0 : nextElementSibling.hasAttribute('data-md-container'))) {
            console.log("Del: Container Item");
            if (nextElementSibling.childElementCount > 1)
                DaemonHandle.AddToOperations({
                    type: "REMOVE",
                    targetNode: nextElementSibling.firstElementChild
                });
            else
                // Only one sub element, delete the whole thing
                DaemonHandle.AddToOperations({
                    type: "REMOVE",
                    targetNode: nextElementSibling
                });
            DaemonHandle.SyncNow();
            return;
        }
        // "Normal" joining lines
        console.log("Del:Line join");
        let NewLine = NearestContainer.cloneNode(true);
        nextElementSibling.childNodes.forEach((ChildNode) => {
            NewLine.appendChild(ChildNode.cloneNode(true));
        });
        DaemonHandle.AddToOperations({
            type: "REMOVE",
            targetNode: nextElementSibling,
        });
        DaemonHandle.AddToOperations({
            type: "REPLACE",
            targetNode: NearestContainer,
            newNode: NewLine
        });
        DaemonHandle.SyncNow();
    }
    // First time loading
    useEffect(() => {
        ;
        (() => __awaiter(this, void 0, void 0, function* () {
            const MDData = SourceData || '';
            // convert MD to HTML
            const convertedHTML = String(yield MD2HTML(MDData));
            let CleanedHTML = HTMLCleanUP(convertedHTML);
            // Save a copy of HTML
            const HTMLParser = new DOMParser();
            EditorSourceDOCRef.current = HTMLParser.parseFromString(String(CleanedHTML), "text/html");
            // save a text copy
            EditorSourceStringRef.current = String(CleanedHTML);
            // load editor component
            setEditorComponent(ConfigAndConvertToReact(String(CleanedHTML)));
        }))();
    }, [SourceData]);
    // Masking and unmasking to hide flicker
    useLayoutEffect(() => {
        if (!EditorElementRef.current || !EditorMaskRef.current)
            return;
        // After elements are properly loaded, hide the mask to show editor content
        EditorElementRef.current.classList.remove("No-Vis");
        EditorMaskRef.current.classList.add('Hide-It');
        EditorMaskRef.current.innerHTML = " ";
    });
    // Editor level selection status monitor
    useLayoutEffect(() => {
        const OnSelectionChange = () => {
            ComponentActivationSwitch();
        };
        const OnSelectStart = () => {
            ComponentActivationSwitch();
        };
        document.addEventListener("selectstart", OnSelectStart);
        document.addEventListener("selectionchange", OnSelectionChange);
        return () => {
            document.removeEventListener("selectstart", OnSelectStart);
            document.removeEventListener("selectionchange", OnSelectionChange);
        };
    }, [EditorElementRef.current, document]);
    // Editor level Key handlers, Override keys
    // NOTE: these will fire after daemon's
    useLayoutEffect(() => {
        var _a, _b;
        function EditorKeydown(ev) {
            if (ev.key === "Enter") {
                EnterKeyHandler(ev);
                return;
            }
            if (ev.key === 'Delete') {
                DelKeyHandler(ev);
                return;
            }
            if (ev.key === 'Backspace') {
                BackSpaceKeyHandler(ev);
                return;
            }
            if (AutoCompleteSymbols.test(ev.key)) {
                AutocompleteHandler(ev.key, ev);
            }
        }
        function EditorKeyUp(ev) {
            // CheckForInputTriggers(ev.key);
            // TODO: May not be needed, delete later
        }
        (_a = EditorElementRef.current) === null || _a === void 0 ? void 0 : _a.addEventListener("keydown", EditorKeydown);
        (_b = EditorElementRef.current) === null || _b === void 0 ? void 0 : _b.addEventListener("keyup", EditorKeyUp);
        return () => {
            var _a, _b;
            (_a = EditorElementRef.current) === null || _a === void 0 ? void 0 : _a.removeEventListener("keydown", EditorKeydown);
            (_b = EditorElementRef.current) === null || _b === void 0 ? void 0 : _b.removeEventListener("keyup", EditorKeyUp);
        };
    }, [EditorElementRef.current]);
    const DaemonHandle = useEditorDaemon(EditorElementRef, EditorSourceDOCRef, ReloadEditorContent, {
        OnRollback: MaskEditingArea,
        TextNodeCallback: TextNodeProcessor,
        ShouldLog: true, //detailed logs
        IsEditable: true,
        ShouldObserve: true
    });
    // Force refreshing the activated component after reloading and caret is restored, needed to be after DaemonHandle's layout effect
    useLayoutEffect(() => {
        ComponentActivationSwitch();
        return () => {
            LastActiveAnchor.current = null;
            LastActivationCache.current = [];
        };
    });
    return (_jsx(_Fragment, { children: _jsxs("section", { className: "Editor", children: [_jsx("main", { className: 'Editor-Inner', ref: EditorElementRef, children: EditorComponent }), _jsx("div", { className: 'Editor-Mask', ref: EditorMaskRef, children: "Floating Mask To Hide Flickering" })] }) }));
}
const Editor = forwardRef(EditorActual);
export default Editor;
// the fallback render for any unknown or unspecified elements
// Needed if the like of br is to be rendered normally.
function CommonRenderer(props) {
    const { children, tagName, ParentAction } = props, otherProps = __rest(props, ["children", "tagName", "ParentAction"]);
    return React.createElement(tagName, otherProps, children);
}
// Editor Spec helpers
/**
 * The hack func that retrieves the react fiber and thus the active component
 * NOT: TraverseUp level set to 6, which means it will find parent component up to "3-levels up" eg: blockquote->p->strong
 */
function FindActiveEditorComponentFiber(DomNode, TraverseUp = 6) {
    const NULL_RETURN = { compFiber: null, parentFiber: null, keyPath: [] };
    if (DomNode.nodeType === Node.TEXT_NODE) {
        if (DomNode.parentNode)
            DomNode = DomNode.parentNode;
        else {
            console.log("Activation Monitor: Text node without parent");
            return NULL_RETURN;
        }
    }
    // Find the key starting with "__reactFiber$" which indicates a React 18 element
    const key = Object.keys(DomNode).find(key => key.startsWith("__reactFiber$"));
    if (!key)
        return NULL_RETURN;
    // Get the Fiber node from the DOM element
    const domFiber = DomNode[key];
    if (domFiber === undefined)
        return NULL_RETURN;
    // Function to get parent component fiber
    const getCompFiber = (fiber) => {
        let parentFiber = fiber.return;
        while (parentFiber && typeof parentFiber.type === "string") {
            parentFiber = parentFiber.return;
        }
        return parentFiber;
    };
    // Get the component fiber and parent fibers
    const compFiber = getCompFiber(domFiber);
    let parentFiber = getCompFiber(domFiber);
    let allParentFibers = [];
    for (let i = 0; i < TraverseUp; i++) {
        parentFiber = getCompFiber(parentFiber);
        if (!parentFiber)
            break;
        if (parentFiber.key && parentFiber.key.toLowerCase().includes('editor'))
            break; //reached editor level
        allParentFibers.push(parentFiber);
    }
    return { compFiber: compFiber, parentFibers: allParentFibers.reverse() };
}
/**
 * Moves the caret to the last end of line (EOL) position within the provided container element.
 * If a current selection is not provided or does not exist, the method will return without performing any action.
 * Used in handling backspace, move caret then sync is more reliable than to set up future token
 *
 * @param {Selection | null} currentSelection - The current selection.
 * @param {HTMLElement} ContainerElement - The container element within which the caret will be moved.
 */
function MoveCaretToLastEOL(currentSelection, ContainerElement) {
    if (!currentSelection)
        return;
    let CurrentAnchor = currentSelection.anchorNode;
    if (!CurrentAnchor)
        return;
    const NearestParagraph = FindWrappingElementWithinContainer(CurrentAnchor, ContainerElement);
    let currentPrevSibling = NearestParagraph === null || NearestParagraph === void 0 ? void 0 : NearestParagraph.previousElementSibling;
    while (currentPrevSibling) {
        if (currentPrevSibling.childNodes.length)
            break;
        currentPrevSibling = currentPrevSibling.previousElementSibling;
    }
    let ValidLandingPoint;
    for (let i = currentPrevSibling.childNodes.length - 1; i >= 0; i--) {
        let LastEOLElement = currentPrevSibling.childNodes[i];
        if (LastEOLElement.nodeType === Node.TEXT_NODE && LastEOLElement.parentNode && LastEOLElement.parentNode.contentEditable !== 'false') {
            ValidLandingPoint = LastEOLElement;
            break;
        }
        if (LastEOLElement.nodeType === Node.ELEMENT_NODE && LastEOLElement.contentEditable !== 'false') {
            ValidLandingPoint = LastEOLElement;
            break;
        }
    }
    if (!ValidLandingPoint || !ValidLandingPoint.textContent)
        return;
    const range = document.createRange();
    try {
        range.collapse(true);
        range.setStart(ValidLandingPoint, ValidLandingPoint.textContent.length);
        currentSelection.removeAllRanges();
        currentSelection.addRange(range);
    }
    catch (e) {
        console.warn(e.message);
    }
    return;
}
/**
 * Returns the next available sibling of a given node within an upper limit.
 *
 * @param {Node | HTMLElement} node - The starting node to find the next available sibling.
 * @param {Node | HTMLElement} upperLimit - The upper limit node to stop the search.
 * @return {Node | null} - The next available sibling or null if not found.
 */
function GetNextAvailableSibling(node, upperLimit) {
    let current = node;
    do {
        let nextSibling = current.nextSibling;
        if (nextSibling && (nextSibling.nodeType === Node.ELEMENT_NODE || nextSibling.textContent && nextSibling.textContent !== '\n')) {
            return nextSibling;
        }
        current = current.parentNode;
    } while (current && current !== upperLimit);
    return null;
}
/**
 * Returns the previous available sibling of a given node within a specified upper limit.
 * An available sibling is defined as the previous sibling that is either an element node or has non-empty text content.
 * If no available sibling is found, null is returned.
 *
 * @param {Node | HTMLElement} node - The node to find the previous available sibling for.
 * @param {Node | HTMLElement} upperLimit - The upper limit node to stop searching for the previous sibling.
 * @return {Node | null} - The previous available sibling of the given node, or null if not found.
 */
function GetPrevAvailableSibling(node, upperLimit) {
    let current = node;
    do {
        let previousSiblingNode = current.previousSibling;
        if (previousSiblingNode && (previousSiblingNode.nodeType === Node.ELEMENT_NODE || previousSiblingNode.textContent && previousSiblingNode.textContent !== '\n')) {
            return previousSiblingNode;
        }
        current = current.parentNode;
    } while (current && current !== upperLimit);
    return null;
}
