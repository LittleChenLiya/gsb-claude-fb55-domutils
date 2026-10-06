import type { Document, Element } from "domhandler";
import { hasChildren } from "domhandler";
import { parseDocument } from "htmlparser2";
import { beforeEach, describe, expect, it } from "vitest";
import {
    compareDocumentPosition,
    removeSubsets,
    sortNodes,
    uniqueSort,
} from "./helpers.js";

describe("helpers", () => {
    describe("removeSubsets", () => {
        const dom = parseDocument("<div><p><span></span></p><p></p></div>")
            .children[0] as Element;

        it("removes identical trees", () =>
            expect(removeSubsets([dom, dom])).toHaveLength(1));

        it("Removes subsets found first", () => {
            const firstChild = dom.children[0] as Element;
            const matches = removeSubsets([dom, firstChild.children[0]]);
            expect(matches).toHaveLength(1);
        });

        it("Removes subsets found last", () =>
            expect(removeSubsets([dom.children[0], dom])).toHaveLength(1));

        it("Does not remove unique trees", () =>
            expect(
                removeSubsets([dom.children[0], dom.children[1]]),
            ).toHaveLength(2));
    });

    describe("compareDocumentPosition", () => {
        const markup = "<div><p><span></span></p><a></a></div>";
        const dom = parseDocument(markup).children[0] as Element;
        const p = dom.children[0] as Element;
        const span = p.children[0];
        const a = dom.children[1];

        it("reports when the first node occurs before the second indirectly", () =>
            expect(compareDocumentPosition(span, a)).toBe(2));

        it("reports when the first node contains the second", () =>
            expect(compareDocumentPosition(p, span)).toBe(10));

        it("reports when the first node occurs after the second indirectly", () =>
            expect(compareDocumentPosition(a, span)).toBe(4));

        it("reports when the first node is contained by the second", () =>
            expect(compareDocumentPosition(span, p)).toBe(20));

        it("reports when the nodes belong to separate documents", () => {
            const otherDom = parseDocument(markup).children[0] as Element;
            const other = (otherDom.children[0] as Element).children[0];

            expect(compareDocumentPosition(span, other)).toBe(1);
        });

        it("reports when the nodes are identical", () =>
            expect(compareDocumentPosition(span, span)).toBe(0));

        it("does not end up in infinite loop (#109)", () => {
            const dom = parseDocument("<div><span>1</span><span>2</span></div>")
                .children[0] as Element;

            expect(
                compareDocumentPosition(
                    dom.children[0],
                    (dom.children[0] as Element).children[0],
                ),
            ).toBe(10);
        });
    });

    describe("uniqueSort", () => {
        let root: Document;
        let dom: Element;
        let p: Element;
        let span: Element;
        let a: Element;

        beforeEach(() => {
            root = parseDocument("<div><p><span></span></p><a></a></div>");
            [dom] = root.children as Element[];
            [p, a] = dom.children as Element[];
            [span] = p.children as Element[];
        });

        it("leaves unique elements untouched", () =>
            expect(uniqueSort([p, a])).toStrictEqual([p, a]));

        it("removes duplicate elements", () =>
            expect(uniqueSort([p, a, p])).toStrictEqual([p, a]));

        it("sorts nodes in document order", () =>
            expect(uniqueSort([a, dom, span, p])).toStrictEqual([
                dom,
                p,
                span,
                a,
            ]));
        it("puts the document node in the right spot", () =>
            expect(uniqueSort([a, dom, span, root, p])).toStrictEqual([
                root,
                dom,
                p,
                span,
                a,
            ]));
    });

    describe("sortNodes", () => {
        it("sorts nodes from multiple roots by root order and document order", () => {
            const rootA = parseDocument("<div><p><span></span></p></div>")
                .children[0] as Element;
            const rootB = parseDocument("<section><h1></h1><a></a></section>")
                .children[0] as Element;
            const p = rootA.children[0] as Element;
            const span = p.children[0] as Element;
            const h1 = rootB.children[0] as Element;
            const a = rootB.children[1] as Element;

            // Deliberately shuffled input across both trees.
            const nodes = [a, span, rootB, p, rootA, h1];
            const sorted = sortNodes(nodes, [rootA, rootB]);

            expect(sorted).toStrictEqual([rootA, p, span, rootB, h1, a]);
        });

        it("removes duplicate nodes by identity", () => {
            const rootA = parseDocument("<div><p></p></div>")
                .children[0] as Element;
            const p = rootA.children[0] as Element;

            const sorted = sortNodes([p, rootA, p, rootA], [rootA]);

            expect(sorted).toStrictEqual([rootA, p]);
        });

        it("does not deduplicate nodes with the same text but different identities", () => {
            const rootA = parseDocument("<div><p>same</p><p>same</p></div>")
                .children[0] as Element;
            const [p1, p2] = rootA.children as Element[];

            const sorted = sortNodes([p2, p1], [rootA]);

            expect(sorted).toStrictEqual([p1, p2]);
        });

        it("does not mutate the input array or the nodes' pointers", () => {
            const rootA = parseDocument("<div><p><span></span></p></div>")
                .children[0] as Element;
            const p = rootA.children[0] as Element;
            const span = p.children[0] as Element;

            const nodes = [span, rootA, p];

            // Capture pointers before sorting.
            const pointers = [rootA, p, span].map((node) => ({
                node,
                parent: node.parent,
                prev: node.prev,
                next: node.next,
                children: hasChildren(node) ? node.children : null,
            }));

            sortNodes(nodes, [rootA]);

            // The input array is unchanged.
            expect(nodes).toStrictEqual([span, rootA, p]);

            // The nodes' pointers are unchanged.
            for (const entry of pointers) {
                expect(entry.node.parent).toBe(entry.parent);
                expect(entry.node.prev).toBe(entry.prev);
                expect(entry.node.next).toBe(entry.next);
                if (entry.children !== null) {
                    expect(
                        hasChildren(entry.node) ? entry.node.children : null,
                    ).toBe(entry.children);
                }
            }
        });

        it("rejects nodes that do not belong to any root", () => {
            const rootA = parseDocument("<div><p></p></div>")
                .children[0] as Element;
            const rootB = parseDocument("<section></section>")
                .children[0] as Element;
            const disconnected = parseDocument("<span></span>")
                .children[0] as Element;

            expect(() =>
                sortNodes([rootA, disconnected, rootB], [rootA, rootB]),
            ).toThrow();
        });
    });
});
