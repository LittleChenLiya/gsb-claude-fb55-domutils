import type { AnyNode } from "domhandler";
import { cloneNode as cloneNodeBase, hasChildren } from "domhandler";

/**
 * Options for {@link cloneNode}.
 *
 * @category Manipulation
 */
export interface CloneNodeOptions {
    /**
     * Clone child nodes as well.
     *
     * @default false
     */
    recursive?: boolean;
    /**
     * Return a map from original nodes to their clones alongside the cloned
     * node. The map covers every cloned node, including text and comment
     * nodes, giving callers ownership of cloned text for further edits.
     *
     * @default false
     */
    withMapping?: boolean;
}

/**
 * Result of {@link cloneNode} when the `withMapping` option is enabled.
 *
 * @category Manipulation
 */
export interface CloneNodeResult<T extends AnyNode> {
    /** The cloned node. */
    node: T;
    /**
     * Map from each node of the original (sub-)tree to its clone. Covers all
     * cloned node types, including text and comment nodes.
     */
    map: Map<AnyNode, AnyNode>;
}

/**
 * Clone a node, and optionally its children.
 *
 * The clone only links within the cloned tree: `parent`, `prev` and `next`
 * of the cloned root are `null`, so external siblings or parents of the
 * original node are never referenced from (or copied into) the clone.
 * Modifying the clone does not affect the original tree.
 *
 * @category Manipulation
 * @param node Node to clone.
 * @param options Clone options; either a `recursive` boolean or a
 * {@link CloneNodeOptions} object. When `withMapping` is enabled, a
 * {@link CloneNodeResult} with an old-node-to-new-node map is returned.
 * @returns A clone of the node, or a result object with the clone and a node
 * map when `withMapping` is enabled.
 */
export function cloneNode<T extends AnyNode>(
    node: T,
    options: CloneNodeOptions & { withMapping: true },
): CloneNodeResult<T>;
export function cloneNode<T extends AnyNode>(
    node: T,
    options?: boolean | CloneNodeOptions,
): T;
export function cloneNode<T extends AnyNode>(
    node: T,
    options: boolean | CloneNodeOptions = {},
): T | CloneNodeResult<T> {
    const { recursive = false, withMapping = false } =
        typeof options === "boolean" ? { recursive: options } : options;

    const clone = cloneNodeBase(node, recursive);

    if (!withMapping) {
        return clone;
    }

    return { node: clone, map: buildNodeMap(node, clone) };
}

/**
 * Walk the original tree and the cloned tree in lockstep and record the
 * mapping from every original node to its clone. Both trees have identical
 * structure, so children line up by index.
 *
 * @param original Root of the original (sub-)tree.
 * @param clone Root of the cloned (sub-)tree.
 * @returns Map from original nodes to cloned nodes.
 */
function buildNodeMap(
    original: AnyNode,
    clone: AnyNode,
): Map<AnyNode, AnyNode> {
    const map = new Map<AnyNode, AnyNode>();
    // The iterator is live: pairs pushed while iterating are visited later.
    const queue: [AnyNode, AnyNode][] = [[original, clone]];

    for (const [source, target] of queue) {
        map.set(source, target);

        if (hasChildren(source) && hasChildren(target)) {
            const sourceChildren = source.children;
            const targetChildren = target.children;

            for (const [childIndex, sourceChild] of sourceChildren.entries()) {
                queue.push([sourceChild, targetChildren[childIndex]]);
            }
        }
    }

    return map;
}
