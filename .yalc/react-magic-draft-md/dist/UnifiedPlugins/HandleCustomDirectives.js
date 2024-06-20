import { visit } from 'unist-util-visit';
import { h } from 'hastscript';
function MDTransformer(ast) {
    // Visit every node
    visit(ast, Visitor);
    function Visitor(node, index, parent) {
        if (node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective') {
            const data = node.data || (node.data = {});
            // Empty Lines
            if (node.name === 'br' && node.type === 'textDirective') {
                // this created an extra layer of p tag, although it may be useful when using :br in a existing line.
                // const hast = h('p', [
                //     h('br')
                // ]);
                const hast = h('br');
                data.hName = hast.tagName;
                data.hProperties = hast.properties;
                data.hChildren = hast.children;
                return node;
            }
            // Special Links
            if (node.name.toLowerCase() === 'linkto' && node.type === 'textDirective') {
                const childNodes = node.children;
                const firstChildValue = childNodes[0].value;
                // Chars that are not allowed in filenames
                const forbiddenChars = /[\\/:*?"<>|]/;
                let LinkToTarget = Object.keys(node.attributes)[0];
                if (!LinkToTarget) {
                    if (firstChildValue && !forbiddenChars.test(firstChildValue))
                        LinkToTarget = firstChildValue;
                    else
                        LinkToTarget = ' ';
                }
                const hast = h(`span`, { 'dataLinkTo': LinkToTarget }, [...childNodes]);
                data.hName = hast.tagName;
                data.hProperties = hast.properties;
                data.hChildren = hast.children;
                return node;
            }
        }
    }
}
const HandleCustomDirectives = () => MDTransformer;
export default HandleCustomDirectives;
