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
 * Tags whose subtrees are skipped by {@link extractText} by default.
 */
const DEFAULT_EXCLUDE_TAGS: ReadonlySet<string> = new Set(["script", "style"]);

/**
 * Options for {@link extractText}.
 */
export interface ExtractTextOptions {
    /**
     * Lowercase tag names whose subtrees are excluded from the result. Nodes
     * adjacent to an excluded element are unaffected. Defaults to
     * `new Set(["script", "style"])`. Pass an empty set to include all tags.
     */
    excludeTags?: Iterable<string>;
    /**
     * Whether `<br>` tags are converted into newline characters. When `false`
     * (the default), `<br>` tags contribute nothing, matching `textContent`.
     */
    brToNewline?: boolean;
}

/**
 * Extract text from `node` without modifying the tree.
 *
 * Like {@link textContent}, this joins all adjacent text nodes (including
 * text next to skipped elements), and ignores comments. Subtrees rooted at
 * any tag in `options.excludeTags` (by default `<script>` and `<style>`) are
 * skipped. `<br>` tags are only converted into newlines when
 * `options.brToNewline` is explicitly set to `true`.
 *
 * @category Stringify
 * @param node Node (or array of nodes) to get the text of.
 * @param options Options controlling excluded tags and `<br>` handling.
 * @returns The extracted text.
 */
export function extractText(
    node: AnyNode | AnyNode[],
    options: ExtractTextOptions = {},
): string {
    const excludeTags =
        options.excludeTags === undefined
            ? DEFAULT_EXCLUDE_TAGS
            : new Set(options.excludeTags);
    const brToNewline = options.brToNewline ?? false;

    function render(nodes: readonly AnyNode[]): string {
        let result = "";
        for (const child of nodes) {
            if (isTag(child)) {
                if (excludeTags.has(child.name)) continue;
                if (child.name === "br") {
                    if (brToNewline) result += "\n";
                    continue;
                }
            }

            if (hasChildren(child) && !isComment(child)) {
                result += render(child.children);
            } else if (isText(child)) {
                result += child.data;
            }
        }
        return result;
    }

    return Array.isArray(node) ? render(node) : render([node]);
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
