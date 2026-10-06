import { type AnyNode, hasChildren, type ParentNode } from "domhandler";

/**
 * Given an array of nodes, remove any member that is contained by another
 * member.
 *
 * @category Helpers
 * @param nodes Nodes to filter.
 * @returns Remaining nodes that aren't contained by other nodes.
 */
export function removeSubsets(nodes: AnyNode[]): AnyNode[] {
    let index = nodes.length;

    /*
     * Check if each node (or one of its ancestors) is already contained in the
     * array.
     */
    while (--index >= 0) {
        const node = nodes[index];

        /*
         * Remove the node if it is not unique.
         * We are going through the array from the end, so we only
         * have to check nodes that preceed the node under consideration in the array.
         */
        if (index > 0 && nodes.lastIndexOf(node, index - 1) >= 0) {
            nodes.splice(index, 1);
            continue;
        }

        for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
            if (nodes.includes(ancestor)) {
                nodes.splice(index, 1);
                break;
            }
        }
    }

    return nodes;
}
/**
 * @category Helpers
 * @see {@link http://dom.spec.whatwg.org/#dom-node-comparedocumentposition}
 */
export const enum DocumentPosition {
    DISCONNECTED = 1,
    PRECEDING = 2,
    FOLLOWING = 4,
    CONTAINS = 8,
    CONTAINED_BY = 16,
}

/**
 * Compare the position of one node against another node in any other document,
 * returning a bitmask with the values from {@link DocumentPosition}.
 *
 * Document order:
 * > There is an ordering, document order, defined on all the nodes in the
 * > document corresponding to the order in which the first character of the
 * > XML representation of each node occurs in the XML representation of the
 * > document after expansion of general entities. Thus, the document element
 * > node will be the first node. Element nodes occur before their children.
 * > Thus, document order orders element nodes in order of the occurrence of
 * > their start-tag in the XML (after expansion of entities). The attribute
 * > nodes of an element occur after the element and before its children. The
 * > relative order of attribute nodes is implementation-dependent.
 *
 * Source:
 * http://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-document-order
 *
 * @category Helpers
 * @param nodeA The first node to use in the comparison
 * @param nodeB The second node to use in the comparison
 * @returns A bitmask describing the input nodes' relative position.
 *
 * See http://dom.spec.whatwg.org/#dom-node-comparedocumentposition for
 * a description of these values.
 */
export function compareDocumentPosition(
    nodeA: AnyNode,
    nodeB: AnyNode,
): number {
    const aParents: ParentNode[] = [];
    const bParents: ParentNode[] = [];

    if (nodeA === nodeB) {
        return 0;
    }

    let current = hasChildren(nodeA) ? nodeA : nodeA.parent;
    while (current) {
        aParents.unshift(current);
        current = current.parent;
    }
    current = hasChildren(nodeB) ? nodeB : nodeB.parent;
    while (current) {
        bParents.unshift(current);
        current = current.parent;
    }

    const maxIndex = Math.min(aParents.length, bParents.length);
    let index = 0;
    while (index < maxIndex && aParents[index] === bParents[index]) {
        index++;
    }

    if (index === 0) {
        return DocumentPosition.DISCONNECTED;
    }

    const sharedParent = aParents[index - 1];
    const siblings: AnyNode[] = sharedParent.children;
    const aSibling = aParents[index];
    const bSibling = bParents[index];

    if (siblings.indexOf(aSibling) > siblings.indexOf(bSibling)) {
        if (sharedParent === nodeB) {
            return DocumentPosition.FOLLOWING | DocumentPosition.CONTAINED_BY;
        }
        return DocumentPosition.FOLLOWING;
    }
    if (sharedParent === nodeA) {
        return DocumentPosition.PRECEDING | DocumentPosition.CONTAINS;
    }
    return DocumentPosition.PRECEDING;
}

/**
 * Sort an array of nodes based on their relative position in the document,
 * removing any duplicate nodes. If the array contains nodes that do not belong
 * to the same document, sort order is unspecified.
 *
 * @category Helpers
 * @param nodes Array of DOM nodes.
 * @returns Collection of unique nodes, sorted in document order.
 */
export function uniqueSort<T extends AnyNode>(nodes: T[]): T[] {
    nodes = nodes.filter(
        (node, index, array) => !array.includes(node, index + 1),
    );

    nodes.sort((a, b) => {
        const relative = compareDocumentPosition(a, b);
        if (relative & DocumentPosition.PRECEDING) {
            return -1;
        }
        if (relative & DocumentPosition.FOLLOWING) {
            return 1;
        }
        return 0;
    });

    return nodes;
}

/**
 * Sort an array of nodes based on their relative position in the document,
 * using the caller-provided root order for nodes that belong to different
 * roots. Nodes are deduplicated by identity, and nodes that do not belong to
 * any of the provided roots are rejected.
 *
 * This is a read-only operation: neither the input array nor the nodes'
 * pointers are mutated, and a new array is returned.
 *
 * @category Helpers
 * @param nodes Array of DOM nodes to sort.
 * @param roots Array of root nodes defining the root order.
 * @returns Collection of unique nodes, sorted by root order and document order.
 */
export function sortNodes<T extends AnyNode>(
    nodes: T[],
    roots: AnyNode[],
): T[] {
    // Deduplicate nodes by identity, without mutating the input.
    const unique = [...new Set(nodes)];

    // Map each root to its position in the caller-provided root order.
    const rootIndices = new Map<AnyNode, number>(
        roots.map((root, index) => [root, index]),
    );

    // Assign each node to the first root found when walking up its ancestors.
    const entries = unique.map((node) => {
        let current: AnyNode | null = node;
        while (current !== null) {
            const rootIndex = rootIndices.get(current);
            if (rootIndex !== undefined) {
                return { node, rootIndex };
            }
            current = current.parent;
        }
        throw new Error("Node is not contained in any root");
    });

    // Sort by root order, then by document order within each root.
    entries.sort((a, b) => {
        if (a.rootIndex !== b.rootIndex) {
            return a.rootIndex - b.rootIndex;
        }
        const relative = compareDocumentPosition(a.node, b.node);
        if (relative & DocumentPosition.PRECEDING) {
            return -1;
        }
        if (relative & DocumentPosition.FOLLOWING) {
            return 1;
        }
        return 0;
    });

    return entries.map((entry) => entry.node);
}
