import { visit } from 'unist-util-visit';
import { h } from 'hastscript';
function EmptyDocHandlerTransformer(ast) {
    visit(ast, 'root', Visitor);
    function Visitor(root) {
        if (!Array.isArray(root.children) || !root.children.length) {
            // add an empty line to the document in case it is empty
            const EmptyLine = h("p", [
                { type: "text", value: "\u00a0" },
                h('br')
            ]);
            root.children.push(EmptyLine);
        }
        return root;
    }
}
export const EmptyDocHandler = () => EmptyDocHandlerTransformer;
