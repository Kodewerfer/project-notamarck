var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as reactJsxRuntime from 'react/jsx-runtime';
import { unified } from "unified";
import { u } from 'unist-builder';
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import remarkStringify from "remark-stringify";
import rehypeParse from "rehype-parse";
import rehypeReact from "rehype-react";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeRemark from "rehype-remark";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import HandleCustomDirectives from "../UnifiedPlugins/HandleCustomDirectives";
import { AddSyntaxInAttribute } from "../UnifiedPlugins/AddSyntaxInAttribute";
import { CleanupExtraTags } from "../UnifiedPlugins/CleanupExtraTags";
import { CleanupEmptyElements } from "../UnifiedPlugins/CleanupEmptyElements";
import { ListElementHandler } from "../UnifiedPlugins/ListElementHandler";
import { EmptyCodeHandler } from "../UnifiedPlugins/EmptyCodeHandler";
import { CleanUpExtraText } from "../UnifiedPlugins/CleanupExtraText";
function MDProcess() {
    return unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        .use(HandleCustomDirectives)
        .use(remarkRehype)
        .use(rehypeSanitize, GetSanitizeSchema())
        .use(AddSyntaxInAttribute)
        .use(rehypeStringify);
}
export function MD2HTML(MarkdownContent) {
    return __awaiter(this, void 0, void 0, function* () {
        return MDProcess()
            .process(MarkdownContent);
    });
}
export function MD2HTMLSync(MarkdownContent) {
    return MDProcess()
        .processSync(MarkdownContent);
}
// the config looks like this to satisfy rehypeReact's spec on option,
// after react 18.3.0, Fragment/jsx/jsxs will correctly provide the types, but the resulting config would be incompatible with rehypeReact 8.0
// until rehypeReact is updated, the structure will need to stay this way.
const jsxElementConfig = {
    Fragment: reactJsxRuntime.Fragment,
    jsx: reactJsxRuntime.jsx,
    jsxs: reactJsxRuntime.jsxs
};
export function HTML2React(HTMLContent, componentOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield unified()
            .use(rehypeParse, { fragment: true })
            .use(rehypeSanitize, GetSanitizeSchema()) //this plug remove some attrs/aspects that may be important.
            .use(CleanUpExtraText)
            .use(CleanupExtraTags)
            .use(CleanupEmptyElements)
            .use(AddSyntaxInAttribute)
            .use(rehypeReact, Object.assign(Object.assign({}, jsxElementConfig), { components: componentOptions }))
            .process(HTMLContent);
    });
}
export function HTML2ReactSnyc(HTMLContent, componentOptions) {
    return unified()
        .use(rehypeParse, { fragment: true })
        .use(rehypeSanitize, GetSanitizeSchema()) //this plug remove some attrs/aspects that may be important.
        .use(CleanUpExtraText)
        .use(CleanupExtraTags)
        .use(CleanupEmptyElements)
        .use(AddSyntaxInAttribute)
        .use(rehypeReact, Object.assign(Object.assign({}, jsxElementConfig), { components: componentOptions }))
        .processSync(HTMLContent);
}
export function HTMLCleanUP(HTMLContent, componentOptions) {
    return unified()
        .use(rehypeParse, { fragment: true })
        .use(rehypeSanitize, GetSanitizeSchema()) //this plug remove some attrs/aspects that may be important.
        .use(CleanUpExtraText)
        .use(CleanupExtraTags)
        .use(CleanupEmptyElements)
        .use(ListElementHandler)
        .use(EmptyCodeHandler)
        .use(rehypeStringify)
        .processSync(HTMLContent);
}
export function HTML2MD(CurrentContent) {
    return __awaiter(this, void 0, void 0, function* () {
        const rehyperRemarkHandlers = GetRehyperRemarkHandlers();
        return yield unified()
            .use(rehypeParse)
            .use(remarkGfm)
            .use(rehypeRemark, {
            handlers: rehyperRemarkHandlers
        })
            .use(remarkStringify, {
            handlers: {
                'text': (node, parent, state) => {
                    // This is to "unescape" the MD syntax such as [ or *,
                    return node.value;
                }
            }
        })
            .process(CurrentContent);
    });
}
function GetRehyperRemarkHandlers() {
    return {
        'br': (State, Node) => {
            const result = u('text', ':br');
            State.patch(Node, result);
            return result;
        },
        'span': (State, Node) => {
            const LinkedTarget = Node.properties['dataLinkTo'];
            if (!LinkedTarget || LinkedTarget === '') {
                return;
            }
            const FirstTextNode = Node.children[0];
            if (!(typeof FirstTextNode === 'object') || !('value' in FirstTextNode))
                return;
            let TextDirectiveContent;
            if (LinkedTarget === FirstTextNode.value)
                TextDirectiveContent = `:LinkTo[${LinkedTarget}]`;
            else
                TextDirectiveContent = `:LinkTo[${FirstTextNode.value}]{${LinkedTarget}}`;
            const result = u('text', TextDirectiveContent);
            State.patch(Node, result);
            return result;
        }
    };
}
/**
 * Returns a sanitized schema by cloning the default schema and adding an additional attribute.
 */
function GetSanitizeSchema() {
    let SanitizeSchema = Object.assign({}, defaultSchema);
    SanitizeSchema.attributes['*'] = SanitizeSchema.attributes['*'].concat(['data*']);
    return SanitizeSchema;
}
