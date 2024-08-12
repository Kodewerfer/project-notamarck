import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { u } from 'unist-builder';
import { remove } from 'unist-util-remove';
import { toMarkdown } from 'mdast-util-to-markdown';
import { directiveFromMarkdown, directiveToMarkdown } from 'mdast-util-directive';
import remarkStringify from 'remark-stringify';
import _ from 'lodash';

import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import { Compatible } from 'unified/lib';

export function TagFileReader(arg: string) {
  const parsedAST = unified().use(remarkParse).use(remarkDirective).parse(arg);

  return unified().use(HandleCustomDirectives).use(CleanUpALLExtra).use(AddIDtoElements).runSync(parsedAST);
}

const HandleCustomDirectives = () => CustomDirectivesTransformer;

function CustomDirectivesTransformer(ast: object) {
  // visit all textDirective, all links will be left behind and all else are removed
  visit<any, any>(ast, 'textDirective', Visitor);

  function Visitor(node: any, _: number, parent: any) {
    // keep special link nodes
    if (node.name.toLowerCase() === 'link' && node.type === 'textDirective') {
      const childNodes = node.children;
      if (!childNodes || !childNodes[0]) return remove(parent, node);

      return node;
    }
    // remove all else
    return remove(parent, node);
  }
}

const CleanUpALLExtra = () => CleanUpTransformer;

function CleanUpTransformer(ast: object) {
  // visit all top level paragraphs, remove all invalid nodes
  visit<any, any>(ast, 'paragraph', Visitor, true);

  function Visitor(paragraphNode: any, index, parent) {
    if (parent && parent.type !== 'root') remove(parent, paragraphNode);

    // paragraph with no child
    if (!Array.isArray(paragraphNode.children) || !paragraphNode.children.length) remove(parent, paragraphNode);
    const filterResult = Array.from(paragraphNode.children).filter((childNode: any) => {
      return childNode.type === 'textDirective';
    });

    if (filterResult.length > 0) {
      return paragraphNode;
    }
    remove(parent, paragraphNode);
    return paragraphNode;
  }
}

const AddIDtoElements = () => IDTransformer;

function IDTransformer(ast: object) {
  // add an unique id to all top level elements so that they can be react keys
  visit<any, any>(ast, 'root', Visitor, true);

  function Visitor(rootNode: any) {
    if (!rootNode.children) return;

    rootNode.children.map((paragraphItem: any) => {
      Object.assign(paragraphItem, {
        uid: ` ${paragraphItem.type ?? 'element'}_${_.random(1, 999)}`,
      });
    });

    return rootNode;
  }
}

// export function TagObjectToMD() {
//   return unified().use(remarkParse).use(remarkDirective).use(remarkStringify);
// }

export function TagObjectToMD(Content: Compatible) {
  return toMarkdown(Content, { extensions: [directiveToMarkdown()] });
}

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
