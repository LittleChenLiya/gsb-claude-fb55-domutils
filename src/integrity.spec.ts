import type { AnyNode, ChildNode, Element } from "domhandler";
import { parseDocument } from "htmlparser2";
import { describe, expect, it } from "vitest";
import { checkTreeIntegrity } from "./integrity.js";

/**
 * Parses `<div><p>a</p><span></span></div>` and returns the `div` as root of
 * a four-node tree: div > (p > text "a"), span.
 */
function parseFourNodeTree() {
    const root = parseDocument("<div><p>a</p><span></span></div>")
        .children[0] as Element;
    const [paragraph, span] = root.children as [Element, Element];
    const text = paragraph.children[0];
    return { root, paragraph, span, text };
}

/**
 * Captures the local links of every node in the tree.
 *
 * @param root
 */
function snapshotLinks(root: AnyNode) {
    const links: {
        node: AnyNode;
        parent: unknown;
        prev: unknown;
        next: unknown;
    }[] = [];
    const stack: AnyNode[] = [root];

    while (stack.length > 0) {
        const node = stack.pop() as AnyNode;
        if ("parent" in node) {
            const child = node as ChildNode;
            links.push({
                node,
                parent: child.parent,
                prev: child.prev,
                next: child.next,
            });
        }

        if ("children" in node) {
            stack.push(...(node.children as AnyNode[]));
        }
    }

    return links;
}

describe("integrity", () => {
    describe("checkTreeIntegrity", () => {
        it("accepts a valid four-node tree", () => {
            const { root } = parseFourNodeTree();
            const report = checkTreeIntegrity(root);

            expect(report.valid).toBe(true);
            expect(report.issue).toBeNull();
        });

        it("reports a broken next link without modifying the tree", () => {
            const { root, paragraph } = parseFourNodeTree();
            paragraph.next = null;
            const before = snapshotLinks(root);

            const report = checkTreeIntegrity(root);

            expect(report.valid).toBe(false);
            expect(report.issue).toMatchObject({
                code: "next-mismatch",
                node: paragraph,
                actual: null,
            });
            expect(report.issue?.expected).toBe(root.children[1]);
            // The checker is read-only: the broken link is still in place.
            expect(paragraph.next).toBeNull();
            expect(snapshotLinks(root)).toEqual(before);
        });

        it("reports a broken prev link without modifying the tree", () => {
            const { root, span } = parseFourNodeTree();
            span.prev = null;

            const report = checkTreeIntegrity(root);

            expect(report.valid).toBe(false);
            expect(report.issue).toMatchObject({
                code: "prev-mismatch",
                node: span,
                actual: null,
            });
            expect(span.prev).toBeNull();
        });

        it("reports a wrong parent link", () => {
            const { root, paragraph, text } = parseFourNodeTree();
            (text as ChildNode).parent = root as never;

            const report = checkTreeIntegrity(root);

            expect(report.valid).toBe(false);
            expect(report.issue).toMatchObject({
                code: "parent-mismatch",
                node: text,
                expected: paragraph,
                actual: root,
            });
        });

        it("reports a sibling ring in finite steps and leaves it untouched", () => {
            const { root, paragraph, span } = parseFourNodeTree();
            // Turn the two siblings into a ring via their prev/next links.
            paragraph.prev = span;
            span.next = paragraph;
            const before = snapshotLinks(root);

            const report = checkTreeIntegrity(root);

            expect(report.valid).toBe(false);
            expect(report.issue?.code).toBe("prev-mismatch");
            expect(report.issue?.node).toBe(paragraph);
            expect(report.issue?.actual).toBe(span);
            expect(snapshotLinks(root)).toEqual(before);
        });

        it("detects a cycle through children arrays by node identity", () => {
            const { root, paragraph, text } = parseFourNodeTree();
            // Re-attach the root below its own child, creating a cycle.
            paragraph.children.push(root as unknown as ChildNode);
            // Keep the local links consistent so the cycle is the only issue.
            (text as ChildNode).next = root as unknown as ChildNode;
            root.prev = text as ChildNode;

            const report = checkTreeIntegrity(root);

            expect(report.valid).toBe(false);
            expect(report.issue).toMatchObject({
                code: "cycle",
                node: root,
            });
        });

        it("detects a node occurring twice among siblings", () => {
            const { root, paragraph, span } = parseFourNodeTree();
            root.children.push(paragraph);
            // Keep the local links consistent so the duplicate is the only issue.
            span.next = paragraph;

            const report = checkTreeIntegrity(root);

            expect(report.valid).toBe(false);
            expect(report.issue).toMatchObject({
                code: "cycle",
                node: paragraph,
            });
        });
    });
});
