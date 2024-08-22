import { visit } from 'unist-util-visit';
import { remove } from 'unist-util-remove';
function TagsCleanupTransformer(ast) {
    visit(ast, 'element', Visitor);
    function Visitor(node, index, parent) {
        const NodeProps = node.properties || (node.properties = {});
        // Remove react generated tags that are left behind
        if (NodeProps['dataIsGenerated']) {
            remove(parent, node);
            return;
        }
        // remove extra br when there are other elements
        if (node.tagName === 'br' && parent.children.length > 1) {
            remove(parent, node);
            return;
        }
        return node;
    }
}
export const CleanupExtraTags = () => TagsCleanupTransformer;
