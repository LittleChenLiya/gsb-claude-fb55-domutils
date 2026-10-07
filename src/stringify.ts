import renderHTML, { type DomSerializerOptions } from "dom-serializer";
import { ElementType } from "domelementtype";
import {
    type AnyNode,
    hasChildren,
    isCDATA,
    isComment,
    isTag,
    isText,
} from "domhandler";

/**
 * @category Stringify
 * @deprecated Use the `dom-serializer` module directly.
 * @param node Node to get the outer HTML of.
 * @param options Options for serialization.
 * @returns `node`'s outer HTML.
 */
export function getOuterHTML(
    node: AnyNode | ArrayLike<AnyNode>,
    options?: DomSerializerOptions,
): string {
    return renderHTML(node, options);
}

/**
 * @category Stringify
 * @deprecated Use the `dom-serializer` module directly.
 * @param node Node to get the inner HTML of.
 * @param options Options for serialization.
 * @returns `node`'s inner HTML.
 */
export function getInnerHTML(
    node: AnyNode,
    options?: DomSerializerOptions,
): string {
    return hasChildren(node)
        ? node.children.map((node) => getOuterHTML(node, options)).join("")
        : "";
}

/**
 * Get a node's inner text. Same as `textContent`, but inserts newlines for `<br>` tags. Ignores comments.
 *
 * @category Stringify
 * @deprecated Use `textContent` instead.
 * @param node Node to get the inner text of.
 * @returns `node`'s inner text.
 */
export function getText(node: AnyNode | AnyNode[]): string {
    if (Array.isArray(node)) return node.map(getText).join("");
    if (isTag(node)) return node.name === "br" ? "\n" : getText(node.children);
    if (isCDATA(node)) return getText(node.children);
    if (isText(node)) return node.data;
    return "";
}

/**
 * Options for {@link extractText}.
 *
 * @category Stringify
 */
export interface ExtractTextOptions {
    /**
     * Names of elements whose entire subtree (the element itself and all of
     * its descendants) is skipped. Text nodes adjacent to excluded elements
     * are still collected.
     *
     * When provided, this replaces the default of `["script", "style"]`.
     */
    excludeTags?: readonly string[];
    /**
     * Whether `<br>` tags are converted to newline characters (`"\n"`).
     *
     * @default false
     */
    brToNewline?: boolean;
}

const DEFAULT_EXCLUDED_TAGS = ["script", "style"];

/**
 * Extract the text of a node, skipping configurable element subtrees.
 *
 * By default, `<script>` and `<style>` subtrees are skipped while adjacent
 * text is preserved. `<br>` tags are only converted to newlines when
 * `brToNewline` is explicitly enabled. Comments are ignored. The traversal
 * does not modify the tree, and the behavior of {@link textContent} and
 * {@link innerText} is unchanged.
 *
 * @category Stringify
 * @param node Node to extract the text of.
 * @param options Options for exclusion and `<br>` handling.
 * @returns The extracted text.
 */
export function extractText(
    node: AnyNode | AnyNode[],
    options: ExtractTextOptions = {},
): string {
    const excludedTags = new Set(options.excludeTags ?? DEFAULT_EXCLUDED_TAGS);
    const brToNewline = options.brToNewline ?? false;
    const parts: string[] = [];
    collectText(node, excludedTags, brToNewline, parts);
    return parts.join("");
}

function collectText(
    node: AnyNode | AnyNode[],
    excludedTags: ReadonlySet<string>,
    brToNewline: boolean,
    parts: string[],
): void {
    if (Array.isArray(node)) {
        for (const child of node) {
            collectText(child, excludedTags, brToNewline, parts);
        }
        return;
    }
    if (isTag(node)) {
        if (excludedTags.has(node.name)) return;
        if (brToNewline && node.name === "br") {
            parts.push("\n");
            return;
        }
    }
    if (hasChildren(node) && !isComment(node)) {
        collectText(node.children, excludedTags, brToNewline, parts);
        return;
    }
    if (isText(node)) parts.push(node.data);
}

/**
 * Get a node's text content. Ignores comments.
 *
 * @category Stringify
 * @param node Node to get the text content of.
 * @returns `node`'s text content.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent}
 */
export function textContent(node: AnyNode | AnyNode[]): string {
    if (Array.isArray(node)) return node.map(textContent).join("");
    if (hasChildren(node) && !isComment(node)) {
        return textContent(node.children);
    }
    if (isText(node)) return node.data;
    return "";
}

/**
 * Get a node's inner text, ignoring `<script>` and `<style>` tags. Ignores comments.
 *
 * @category Stringify
 * @param node Node to get the inner text of.
 * @returns `node`'s inner text.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/innerText}
 */
export function innerText(node: AnyNode | AnyNode[]): string {
    if (Array.isArray(node)) return node.map(innerText).join("");
    if (hasChildren(node) && (node.type === ElementType.Tag || isCDATA(node))) {
        return innerText(node.children);
    }
    if (isText(node)) return node.data;
    return "";
}
