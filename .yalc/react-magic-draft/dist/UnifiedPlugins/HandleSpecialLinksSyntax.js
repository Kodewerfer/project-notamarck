import { visit } from "unist-util-visit";
import { h } from 'hastscript';
/**
 *  Old implementation that directly dealt wit text node handling,
 *  No longer in use
 *  Kept for future reference
 */
//Regex for the custom MD syntax
const SyntaxRegex = /@\[(.*?)]/g;
const TagName = "span";
const MDTransformer = (ast) => {
    // At this stage, the custom MD syntax will be in a normal text syntax node due to it not being processed by previous plugins that only handled the general use cases.
    visit(ast, 'text', visitor);
    function visitor(node, nodeIndex, parentNode) {
        let regExpCopy = SyntaxRegex;
        let textNodeValue = node.value;
        // No use for the positional information yet.
        const nodePosition = node.position;
        let match;
        let NewChildNodesForParent = [];
        while (null !== (match = regExpCopy.exec(textNodeValue))) {
            const [matchedTextWhole, matchedTextBare] = match;
            const textPreValue = textNodeValue.slice(0, match.index);
            if (textPreValue !== "" && textPreValue !== " ") {
                const textNodePre = {
                    type: 'text',
                    value: textPreValue
                };
                NewChildNodesForParent.push(textNodePre);
            }
            // Add the Special link in the middle
            const ConvertChildNode = h(`${TagName}`, { 'dataLinkTo': `${matchedTextBare}` }, [`${matchedTextBare}`]);
            NewChildNodesForParent.push(ConvertChildNode);
            let bPostValuePlain = true;
            const textPostValue = textNodeValue.slice(match.index + matchedTextWhole.length, textNodeValue.length);
            if (textPostValue.search(regExpCopy) !== -1) {
                bPostValuePlain = false;
                textNodeValue = textPostValue;
                // Since the original text has been changed,
                // resetting the RegExp's index to 0 so that it can start again
                // If we remove the `g` from the RegExp, this reset would not have been needed.
                // but that way the RegExp won't know what has been searched already, and therefore go into a loop for the `normal` cases where the Post Text is plain
                // in that case,
                regExpCopy.lastIndex = 0;
            }
            if (textPostValue !== "" && bPostValuePlain) {
                const textNodePost = {
                    type: 'text',
                    value: textPostValue
                };
                NewChildNodesForParent.push(textNodePost);
            }
        }
        // No custom tags found
        if (!NewChildNodesForParent.length) {
            return node;
        }
        let parentNodeModified = {
            children: [
                ...parentNode.children.slice(0, nodeIndex),
                ...NewChildNodesForParent,
                ...parentNode.children.slice(nodeIndex + 1)
            ]
        };
        Object.assign(parentNode, parentNodeModified);
        return node;
    }
};
const HTMLTransformer = (ast) => {
    visit(ast, 'element', visitor);
    function visitor(node, nodeIndex, parentNode) {
        if (node.tagName !== TagName)
            return;
        if (!node.properties['dataLinkTo']) {
            return;
        }
        const LinkToValue = node.properties['dataLinkTo'];
        const ConvertedTextNode = {
            type: 'text',
            value: `@[${LinkToValue}]`
        };
        let parentNodeModified = {
            children: [
                ...parentNode.children.slice(0, nodeIndex),
                ConvertedTextNode,
                ...parentNode.children.slice(nodeIndex + 1)
            ]
        };
        Object.assign(parentNode, parentNodeModified);
    }
};
export const MDSpecialLinks = () => MDTransformer;
export const HTMLSpecialLinks = () => HTMLTransformer;
