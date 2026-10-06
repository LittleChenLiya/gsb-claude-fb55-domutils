import {
    type AnyNode,
    type ChildNode,
    hasChildren,
    type ParentNode,
} from "domhandler";

/**
 * The kind of structural conflict detected by {@link checkStructure}.
 */
export type StructureConflict =
    | {
          /** The child's `parent` does not match the node whose `children` contain it. */
          kind: "parent";
          node: ChildNode;
          expected: ParentNode | null;
          actual: ParentNode | null;
      }
    | {
          /** The child's `prev` does not match the preceding sibling in the `children` array. */
          kind: "prev";
          node: ChildNode;
          expected: ChildNode | null;
          actual: ChildNode | null;
      }
    | {
          /** The child's `next` does not match the following sibling in the `children` array. */
          kind: "next";
          node: ChildNode;
          expected: ChildNode | null;
          actual: ChildNode | null;
      }
    | {
          /** A node was reached again while traversing, indicating a cycle. */
          kind: "cycle";
          node: AnyNode;
      };

/**
 * Check that the sibling chains of the tree rooted at `root` are consistent
 * with the `children`, `parent`, `prev` and `next` references.
 *
 * This is a read-only check: the tree is never modified. Traversal keeps track
 * of visited nodes by identity, so a cyclic structure is reported as a
 * `cycle` conflict instead of causing an infinite loop. Only the local
 * sibling chains of the single tree rooted at `root` are checked; the first
 * conflict encountered in document order is returned.
 *
 * @category Helpers
 * @param root The root of the tree to check.
 * @returns The first conflict found, or `null` if the tree is consistent.
 */
export function checkStructure(root: AnyNode): StructureConflict | null {
    const visited = new Set<AnyNode>();

    const visit = (node: AnyNode): StructureConflict | null => {
        if (visited.has(node)) {
            return { kind: "cycle", node };
        }
        visited.add(node);

        if (!hasChildren(node)) {
            return null;
        }

        const { children } = node;

        for (let index = 0; index < children.length; index++) {
            const child = children[index];

            if (child.parent !== node) {
                return {
                    kind: "parent",
                    node: child,
                    expected: node,
                    actual: child.parent,
                };
            }

            const expectedPrevious = index === 0 ? null : children[index - 1];
            if (child.prev !== expectedPrevious) {
                return {
                    kind: "prev",
                    node: child,
                    expected: expectedPrevious,
                    actual: child.prev,
                };
            }

            const expectedNext =
                index === children.length - 1 ? null : children[index + 1];
            if (child.next !== expectedNext) {
                return {
                    kind: "next",
                    node: child,
                    expected: expectedNext,
                    actual: child.next,
                };
            }

            const conflict = visit(child);
            if (conflict !== null) {
                return conflict;
            }
        }

        return null;
    };

    return visit(root);
}
