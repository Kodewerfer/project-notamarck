import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { u } from 'unist-builder';
import { h } from 'hastscript';

import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';

export function TagMDProcessor() {
  return unified().use(remarkParse).use(remarkDirective).use(HandleCustomDirectives);
  // .use(rehypeStringify);
}

function CustomDirectivesTransformer(ast: object) {
  // Visit every node
  visit<any, any>(ast, Visitor);

  function Visitor(node: any) {
    if (node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective') {
      const data = node.data || (node.data = {});

      // what the text node should be like, return as a text node when there is not a match
      const directiveAttrKeys = Object.keys(node.attributes);
      const directiveAttrString = JSON.stringify(Object.keys(node.attributes)).replace(/\[/g, '{').replace(/]/g, '}');
      const directiveChildrenValues = Array.from(node.children).map((item: any) => {
        return item.value;
      });
      // as fallback
      const TextNodeRestored = u(
        'text',
        `:${node.name}${directiveChildrenValues.length ? JSON.stringify(directiveChildrenValues) : ''}${directiveAttrKeys.length ? directiveAttrString : ''}`,
      );

      /**
       * Special Links
       */
      if (node.name.toLowerCase() === 'link' && node.type === 'textDirective') {
        const childNodes = node.children;
        if (!childNodes || !childNodes[0]) return Object.assign(node, TextNodeRestored);
        const firstChildValue: string = childNodes[0].value; //as target for the file links

        const hast = h(`span`, { dataFileLink: firstChildValue }, [...childNodes]);

        data.hName = hast.tagName;
        data.hProperties = hast.properties;
        data.hChildren = hast.children;
        return node;
      }

      // fallback, return the text node as it was
      Object.assign(node, TextNodeRestored);
      return node;
    }
  }
}

const HandleCustomDirectives = () => CustomDirectivesTransformer;

export function DirectiveElementToMD() {
  return {
    span: (State: any, Node: any) => {
      const LinkedTarget = Node.properties['dataFileLink'];
      if (!LinkedTarget || LinkedTarget === '') {
        return;
      }

      const FirstTextNode = Node.children[0];
      if (!(typeof FirstTextNode === 'object') || !('value' in FirstTextNode)) return;

      let TextDirectiveContent: string;

      if (LinkedTarget === FirstTextNode.value) TextDirectiveContent = `:Link[${LinkedTarget}]`;
      else TextDirectiveContent = `:Link[${FirstTextNode.value}]{${LinkedTarget}}`;

      const result = u('text', TextDirectiveContent);

      State.patch(Node, result);
      return result;
    },
  };
}
