import { TextNodeProcessor } from "../../Utils/Helpers";
/**
 * Compiles all the text nodes within the specified container element.
 *
 * @param {HTMLElement} ContainerElement - The container element to search for text nodes.
 *
 * @returns {string} - The compiled text from all the found text nodes.
 */
export function CompileAllTextNode(ContainerElement) {
    if (!ContainerElement)
        return null;
    let elementWalker = document.createTreeWalker(ContainerElement, NodeFilter.SHOW_TEXT);
    let node;
    let textContentResult = '';
    while (node = elementWalker.nextNode()) {
        let textActual = node.textContent;
        if (node.textContent) {
            if (node.parentNode.hasAttribute("data-fake-text"))
                textActual = "";
            else if (node.textContent === '\u00A0')
                textActual = "";
            else
                textActual = node.textContent.replace(/\u00A0/g, ' ');
        }
        textContentResult += textActual;
    }
    return textContentResult;
}
export function CompileDisplayTextNodes(ContainerElement) {
    if (!ContainerElement)
        return null;
    let elementWalker = document.createTreeWalker(ContainerElement, NodeFilter.SHOW_TEXT);
    let node;
    let textContentResult = '';
    while (node = elementWalker.nextNode()) {
        let textActual = node.textContent;
        if (node.textContent) {
            if (node.parentNode.dataset["IsGenerated"] || node.parentNode.contentEditable === "false")
                textActual = "";
            else if (node.textContent === '\u00A0')
                textActual = "";
            else
                textActual = node.textContent.replace(/\u00A0/g, ' ');
        }
        textContentResult += textActual;
    }
    return textContentResult;
}
export function UpdateComponentAndSync(daemonHandle, TextNodeContent, ParentElement) {
    if (!TextNodeContent || !ParentElement || !daemonHandle)
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
export function UpdateContainerAndSync(daemonHandle, ContainerFullText, Container, ContainerTagName) {
    if (!ContainerFullText || !Container || !daemonHandle)
        return;
    // Not removing the wrapper with processor
    const textNodeResult = TextNodeProcessor(ContainerFullText, false);
    if (!textNodeResult)
        return;
    let documentFragment = document.createDocumentFragment();
    textNodeResult === null || textNodeResult === void 0 ? void 0 : textNodeResult.forEach(item => documentFragment.appendChild(item));
    daemonHandle.AddToOperations({
        type: "REPLACE",
        targetNode: Container,
        newNode: documentFragment //first result node only
    });
    return daemonHandle.SyncNow();
}
