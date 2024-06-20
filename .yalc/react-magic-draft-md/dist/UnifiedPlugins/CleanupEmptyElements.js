import { visit } from 'unist-util-visit';
import { remove } from 'unist-util-remove';
import { h } from 'hastscript';
const SelfClosingHTMLElementsMap = new Map([
    ["area", true],
    ["base", true],
    ["br", true],
    ["col", true],
    ["command", true],
    ["embed", true],
    ["hr", true],
    ["img", true],
    ["input", true],
    ["keygen", true],
    ["link", true],
    ["meta", true],
    ["param", true],
    ["source", true],
    ["track", true],
    ["wbr", true]
]);
function ElementsCleanupTransformer(ast) {
    visit(ast, 'element', Visitor);
    function Visitor(node, index, parent) {
        if (node.type.toLowerCase() === "element" && !SelfClosingHTMLElementsMap.get(node.tagName) && !node.children.length) {
            if (node.tagName === 'li' || (node.tagName === 'code' && parent.tagName === 'pre')) {
                const mockupElement = h("span", "\u00A0");
                node.children && node.children.push(...mockupElement.children);
                return node;
            }
            else {
                remove(parent, node);
            }
        }
        return node;
    }
}
export const CleanupEmptyElements = () => ElementsCleanupTransformer;
