import type { AnyNode, Document, Element, Text } from "domhandler";
import { parseDocument } from "htmlparser2";
import { beforeEach, describe, expect, it } from "vitest";
import {
    compareDocumentPosition,
    removeSubsets,
    sortNodes,
    uniqueSort,
} from "./helpers.js";

const NO_ROOT_ERROR = /does not belong to any of the provided roots/;

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
        let rootA: Document;
        let rootB: Document;
        let divA: Element;
        let pA: Element;
        let spanA: Element;
        let aA: Element;
        let ulB: Element;
        let liB1: Element;
        let liB2: Element;

        beforeEach(() => {
            rootA = parseDocument("<div><p><span></span></p><a></a></div>");
            rootB = parseDocument("<ul><li></li><li></li></ul>");
            [divA] = rootA.children as Element[];
            [pA, aA] = divA.children as Element[];
            [spanA] = pA.children as Element[];
            [ulB] = rootB.children as Element[];
            [liB1, liB2] = ulB.children as Element[];
        });

        it("sorts shuffled nodes from two roots in root order, then document order", () =>
            expect(
                sortNodes(
                    [liB2, aA, ulB, spanA, liB1, pA, divA],
                    [rootA, rootB],
                ),
            ).toStrictEqual([divA, pA, spanA, aA, ulB, liB1, liB2]));

        it("follows the caller-provided root order", () =>
            expect(
                sortNodes(
                    [liB2, aA, ulB, spanA, liB1, pA, divA],
                    [rootB, rootA],
                ),
            ).toStrictEqual([ulB, liB1, liB2, divA, pA, spanA, aA]));

        it("deduplicates nodes by identity", () =>
            expect(
                sortNodes([divA, pA, divA, spanA, pA], [rootA]),
            ).toStrictEqual([divA, pA, spanA]));

        it("keeps distinct nodes with identical text", () => {
            const root = parseDocument("<div><b>x</b><b>x</b></div>");
            const [div] = root.children as Element[];
            const [first, second] = div.children as Element[];

            expect(sortNodes([second, first], [root])).toStrictEqual([
                first,
                second,
            ]);
        });

        it("orders text nodes among their siblings", () => {
            const root = parseDocument("<div>hello<span></span></div>");
            const [div] = root.children as Element[];
            const [text, span] = div.children as [Text, Element];

            expect(sortNodes([span, text], [root])).toStrictEqual([text, span]);
        });

        it("puts the root itself first when included", () =>
            expect(sortNodes([pA, rootA, divA], [rootA])).toStrictEqual([
                rootA,
                divA,
                pA,
            ]));

        it("does not modify the input arrays or the node tree", () => {
            const nodes: AnyNode[] = [liB2, aA, ulB, spanA, liB1, pA, divA];
            const roots: AnyNode[] = [rootA, rootB];

            const sorted = sortNodes(nodes, roots);

            expect(sorted).not.toBe(nodes);
            expect(nodes).toStrictEqual([liB2, aA, ulB, spanA, liB1, pA, divA]);
            expect(roots).toStrictEqual([rootA, rootB]);
            // Parent/child pointers are untouched.
            expect(rootA.children).toStrictEqual([divA]);
            expect(divA.children).toStrictEqual([pA, aA]);
            expect(pA.children).toStrictEqual([spanA]);
            expect(spanA.parent).toBe(pA);
            expect(pA.parent).toBe(divA);
            expect(divA.parent).toBe(rootA);
            expect(ulB.children).toStrictEqual([liB1, liB2]);
            expect(liB1.parent).toBe(ulB);
            expect(liB2.parent).toBe(ulB);
            expect(ulB.parent).toBe(rootB);
        });

        it("rejects nodes that do not belong to any root", () => {
            const other = parseDocument("<em></em>").children[0];

            expect(() => sortNodes([divA, other], [rootA, rootB])).toThrow(
                NO_ROOT_ERROR,
            );
        });

        it("rejects detached nodes", () => {
            const detached = parseDocument("<em></em>").children[0];
            detached.parent = null;

            expect(() => sortNodes([detached], [rootA])).toThrow(NO_ROOT_ERROR);
        });
    });
});
