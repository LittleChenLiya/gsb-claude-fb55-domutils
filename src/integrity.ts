import { type AnyNode, hasChildren } from "domhandler";

/**
 * Kinds of structural conflicts detected by {@link checkTreeIntegrity}.
 *
 * @category Integrity
 */
export type IntegrityIssueCode =
    /** A child's `parent` does not point back to the node whose `children` array contains it. */
    | "parent-mismatch"
    /** A child's `prev` does not match its predecessor in the `children` array. */
    | "prev-mismatch"
    /** A child's `next` does not match its successor in the `children` array. */
    | "next-mismatch"
    /** The same node instance was encountered more than once (a cycle or duplicate). */
    | "cycle";

/**
 * A single structural conflict found in a tree.
 *
 * @category Integrity
 */
export interface IntegrityIssue {
    /** The kind of conflict. */
    code: IntegrityIssueCode;
    /** The node at which the conflict was detected. */
    node: AnyNode;
    /** The node that was expected at the conflicting link, if any. */
    expected: AnyNode | null;
    /** The node actually found at the conflicting link, if any. */
    actual: AnyNode | null;
    /** A human-readable description of the conflict. */
    message: string;
}

/**
 * The result of {@link checkTreeIntegrity}.
 *
 * @category Integrity
 */
export interface IntegrityReport {
    /** Whether the tree passed all checks. */
    valid: boolean;
    /** The first conflict found, or `null` if the tree is valid. */
    issue: IntegrityIssue | null;
}

function describeNode(node: AnyNode): string {
    const name = "name" in node ? node.name : node.type;
    return `node <${String(name)}>`;
}

function fail(
    code: IntegrityIssueCode,
    node: AnyNode,
    expected: AnyNode | null,
    actual: AnyNode | null,
    message: string,
): IntegrityReport {
    return { valid: false, issue: { code, node, expected, actual, message } };
}

/**
 * Read-only structural checker for a single-rooted tree.
 *
 * Verifies, for every node reachable from `root` via `children` arrays, that
 * the local links are consistent:
 *
 * - each child's `parent` points back to the node whose `children` array
 *   contains it;
 * - each child's `prev` / `next` match its neighbors in that `children`
 *   array (`null` at the ends);
 * - no node instance occurs more than once (cycles are detected by node
 *   identity, so the check always terminates in a finite number of steps).
 *
 * The first conflict found is reported; nothing is repaired and the tree is
 * never modified.
 *
 * @category Integrity
 * @param root The root of the tree to check.
 * @returns A report with `valid: true`, or the first issue encountered.
 */
export function checkTreeIntegrity(root: AnyNode): IntegrityReport {
    const visited = new Set<AnyNode>([root]);
    const stack: AnyNode[] = [root];

    while (stack.length > 0) {
        const parent = stack.pop() as AnyNode;
        if (!hasChildren(parent)) continue;

        const { children } = parent;

        for (let index = 0; index < children.length; index++) {
            const child = children[index];

            if (visited.has(child)) {
                return fail(
                    "cycle",
                    child,
                    null,
                    child,
                    `${describeNode(child)} occurs more than once in the tree ` +
                        `(again as child ${index} of ${describeNode(parent)}).`,
                );
            }

            visited.add(child);

            if (child.parent !== parent) {
                return fail(
                    "parent-mismatch",
                    child,
                    parent,
                    child.parent,
                    `${describeNode(child)} is child ${index} of ` +
                        `${describeNode(parent)}, but its parent link differs.`,
                );
            }

            const expectedPrevious = index === 0 ? null : children[index - 1];

            if (child.prev !== expectedPrevious) {
                return fail(
                    "prev-mismatch",
                    child,
                    expectedPrevious,
                    child.prev,
                    `${describeNode(child)} is child ${index} of ` +
                        `${describeNode(parent)}, but its prev link differs.`,
                );
            }

            const expectedNext =
                index === children.length - 1 ? null : children[index + 1];

            if (child.next !== expectedNext) {
                return fail(
                    "next-mismatch",
                    child,
                    expectedNext,
                    child.next,
                    `${describeNode(child)} is child ${index} of ` +
                        `${describeNode(parent)}, but its next link differs.`,
                );
            }

            stack.push(child);
        }
    }

    return { valid: true, issue: null };
}
