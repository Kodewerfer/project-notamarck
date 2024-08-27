import { visit } from 'unist-util-visit';
function Transformer(ast) {
    visit(ast, 'TYPE', Visitor);
    function Visitor(node, index, parent) {
        let newNode = 'do work here';
        return Object.assign(node, newNode);
    }
}
export const Plugin = () => Transformer;
