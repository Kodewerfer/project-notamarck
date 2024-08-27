import { visit } from 'unist-util-visit';
function Transformer(ast) {
    visit(ast, 'element', Visitor);
    function Visitor(node, index, parent) {
        const NodeProps = node.properties || (node.properties = {});
        const tagName = node.tagName.toLowerCase();
        // Add as ID could break how caret restoration works
        NodeProps.dataKey = `${tagName}_${Math.random().toString(36).slice(2)}_${index}`;
        return node;
    }
}
export const AddKeyToElement = () => Transformer;
