import {
    type AnyNode,
    type ChildNode,
    cloneNode as cloneNodeImpl,
    hasChildren,
    type ParentNode,
} from "domhandler";

/**
 * Options for {@link cloneNode}.
 *
 * @category Manipulation
 */
export interface CloneNodeOptions {
    /**
     * When `true`, the node and all of its descendants are cloned, and the
     * returned {@link CloneNodeResult.nodeMap} maps every original node to its
     * clone (including text and comment nodes).
     *
     * @default false
     */
    nodeMap?: boolean;
}

/**
 * Result of {@link cloneNode} when {@link CloneNodeOptions.nodeMap} is enabled.
 *
 * @category Manipulation
 */
export interface CloneNodeResult<T extends AnyNode = AnyNode> {
    /** The cloned root node. */
    clone: T;
    /** Map from every original node (including text and comments) to its clone. */
    nodeMap: Map<AnyNode, AnyNode>;
}

/**
 * Clone a node.
 *
 * Without options (or with `{ nodeMap: false }`), this delegates to the
 * underlying `domhandler` implementation: the node itself is cloned, and
 * children are only cloned when `recursive` is `true`.
 *
 * With `{ nodeMap: true }`, the node is cloned recursively and the result
 * additionally contains a map from each original node to its corresponding
 * clone. The map covers every node in the cloned tree, including text and
 * comment nodes. Cloned `parent`, `prev`, and `next` links only point at nodes
 * inside the cloned tree; links to external siblings or the original parent
 * are not copied, so mutating the clone never affects the original tree.
 *
 * @category Manipulation
 * @param node Node to clone.
 * @param recursive Clone child nodes as well. Has no effect when
 *   {@link CloneNodeOptions.nodeMap} is enabled (the clone is always recursive).
 * @returns A clone of the node.
 */
export function cloneNode<T extends AnyNode>(node: T, recursive?: boolean): T;
/**
 * Clone a node without a node map, using the legacy return shape.
 *
 * @category Manipulation
 * @param node Node to clone.
 * @param options Options with {@link CloneNodeOptions.nodeMap} disabled.
 * @param options.nodeMap Must be unset or `false`.
 * @returns A shallow clone of the node.
 */
export function cloneNode<T extends AnyNode>(
    node: T,
    options: { nodeMap?: false },
): T;
/**
 * Clone a node recursively, returning the clone together with a node map.
 *
 * @category Manipulation
 * @param node Node to clone.
 * @param options Options enabling the old-node-to-new-node map.
 * @param options.nodeMap Must be `true`.
 * @returns An object containing the cloned root and the node map.
 */
export function cloneNode<T extends AnyNode>(
    node: T,
    options: { nodeMap: true },
): CloneNodeResult<T>;
export function cloneNode<T extends AnyNode>(
    node: T,
    recursiveOrOptions: boolean | CloneNodeOptions = false,
): T | CloneNodeResult<T> {
    if (typeof recursiveOrOptions !== "boolean" && recursiveOrOptions.nodeMap) {
        const nodeMap = new Map<AnyNode, AnyNode>();
        const clone = cloneWithMap(node, nodeMap) as T;

        return { clone, nodeMap };
    }

    const recursive =
        typeof recursiveOrOptions === "boolean" ? recursiveOrOptions : false;

    return cloneNodeImpl(node, recursive);
}

/**
 * Recursively clone a node and record the old-node-to-new-node mapping.
 *
 * Reuses the existing `domhandler` clone implementation for each node, then
 * restores `parent`/`prev`/`next` links using the map so links can only point
 * into the cloned tree.
 *
 * @param node Node to clone.
 * @param nodeMap Map to record the old-node-to-new-node mapping in.
 * @returns The cloned node.
 */
function cloneWithMap(node: AnyNode, nodeMap: Map<AnyNode, AnyNode>): AnyNode {
    const clone = cloneNodeImpl(node, false);

    nodeMap.set(node, clone);
    /*
     * A fresh clone must not retain any link into the original tree. The
     * underlying implementation already nulls these, but be explicit here.
     */
    clone.parent = null;
    clone.prev = null;
    clone.next = null;

    if (hasChildren(node) && hasChildren(clone)) {
        const children = node.children.map((child) =>
            cloneWithMap(child, nodeMap),
        );

        for (const [index, child] of children.entries()) {
            child.parent = clone;
            child.prev = index > 0 ? children[index - 1] : null;
            child.next =
                index < children.length - 1 ? children[index + 1] : null;
        }

        clone.children = children as ChildNode[];
    }

    return clone;
}

/**
 * Remove an element from the dom
 *
 * @category Manipulation
 * @param element The element to be removed.
 */
export function removeElement(element: ChildNode): void {
    if (element.prev) element.prev.next = element.next;
    if (element.next) element.next.prev = element.prev;

    if (element.parent) {
        const childs = element.parent.children;
        const childsIndex = childs.lastIndexOf(element);
        if (childsIndex !== -1) {
            childs.splice(childsIndex, 1);
        }
    }
    element.next = null;
    element.prev = null;
    element.parent = null;
}

/**
 * Replace an element in the dom
 *
 * @category Manipulation
 * @param element The element to be replaced.
 * @param replacement The element to be added
 */
export function replaceElement(
    element: ChildNode,
    replacement: ChildNode,
): void {
    replacement.prev = element.prev;
    if (replacement.prev) {
        replacement.prev.next = replacement;
    }

    replacement.next = element.next;
    if (replacement.next) {
        replacement.next.prev = replacement;
    }

    replacement.parent = element.parent;
    if (replacement.parent) {
        const { children } = replacement.parent;
        const elementIndex = children.lastIndexOf(element);
        if (elementIndex === -1) {
            return;
        }

        children[elementIndex] = replacement;
        element.parent = null;
    }
}

/**
 * Append a child to an element.
 *
 * @category Manipulation
 * @param parent The element to append to.
 * @param child The element to be added as a child.
 */
export function appendChild(parent: ParentNode, child: ChildNode): void {
    removeElement(child);

    child.next = null;
    child.parent = parent;

    if (parent.children.push(child) > 1) {
        const sibling = parent.children[parent.children.length - 2];
        sibling.next = child;
        child.prev = sibling;
    } else {
        child.prev = null;
    }
}

/**
 * Append an element after another.
 *
 * @category Manipulation
 * @param element The element to append after.
 * @param next The element be added.
 */
export function append(element: ChildNode, next: ChildNode): void {
    removeElement(next);

    const { parent } = element;
    const currentNext = element.next;

    next.next = currentNext;
    next.prev = element;
    element.next = next;
    next.parent = parent;

    if (currentNext) {
        currentNext.prev = next;
        if (parent) {
            const childs = parent.children;
            childs.splice(childs.lastIndexOf(currentNext), 0, next);
        }
    } else if (parent) {
        parent.children.push(next);
    }
}

/**
 * Prepend a child to an element.
 *
 * @category Manipulation
 * @param parent The element to prepend before.
 * @param child The element to be added as a child.
 */
export function prependChild(parent: ParentNode, child: ChildNode): void {
    removeElement(child);

    child.parent = parent;
    child.prev = null;

    if (parent.children.unshift(child) === 1) {
        child.next = null;
    } else {
        const sibling = parent.children[1];
        sibling.prev = child;
        child.next = sibling;
    }
}

/**
 * Prepend an element before another.
 *
 * @category Manipulation
 * @param element The element to prepend before.
 * @param previous The element to be added.
 */
export function prepend(element: ChildNode, previous: ChildNode): void {
    removeElement(previous);

    const { parent } = element;
    if (parent) {
        const childs = parent.children;
        childs.splice(childs.indexOf(element), 0, previous);
    }

    if (element.prev) {
        element.prev.next = previous;
    }

    previous.parent = parent;
    previous.prev = element.prev;
    previous.next = element;
    element.prev = previous;
}
