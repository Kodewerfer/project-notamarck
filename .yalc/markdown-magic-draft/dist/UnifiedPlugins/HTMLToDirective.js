// Handles custom directive conversion from HTML to MD
import { u } from "unist-builder";
export function GetRehyperRemarkHandlers(keepBrs = true) {
    const Handlers = {
        'span': (State, Node) => {
            const LinkedTarget = Node.properties['dataFileLink'];
            if (!LinkedTarget || LinkedTarget === '') {
                return;
            }
            const FirstTextNode = Node.children[0];
            if (!(typeof FirstTextNode === 'object') || !('value' in FirstTextNode))
                return;
            let TextDirectiveContent;
            if (LinkedTarget === FirstTextNode.value)
                TextDirectiveContent = `:Link[${LinkedTarget}]`;
            else
                TextDirectiveContent = `:Link[${FirstTextNode.value}]{${LinkedTarget}}`;
            const result = u('text', TextDirectiveContent);
            State.patch(Node, result);
            return result;
        }
    };
    const brHandler = {
        'br': (State, Node) => {
            const result = u('text', ':br');
            State.patch(Node, result);
            return result;
        }
    };
    if (keepBrs)
        Object.assign(Handlers, brHandler);
    return Handlers;
}
