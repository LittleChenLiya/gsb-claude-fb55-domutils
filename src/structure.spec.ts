import type { Element } from "domhandler";
import { parseDocument } from "htmlparser2";
import { describe, expect, it } from "vitest";
import { checkStructure } from "./structure.js";

function parseDOM(markup: string) {
    return parseDocument(markup).children;
}

describe("checkStructure", () => {
    it("returns null for a valid four-node tree", () => {
        const root = parseDOM(
            "<div><p></p><span></span><a></a></div>",
        )[0] as Element;

        expect(checkStructure(root)).toBeNull();
    });

    it("reports a broken next link at the corresponding node", () => {
        const root = parseDOM(
            "<div><p></p><span></span><a></a></div>",
        )[0] as Element;
        const [, span, a] = root.children;

        span.next = null;

        expect(checkStructure(root)).toEqual({
            kind: "next",
            node: span,
            expected: a,
            actual: null,
        });
    });

    it("reports a broken prev link at the corresponding node", () => {
        const root = parseDOM(
            "<div><p></p><span></span><a></a></div>",
        )[0] as Element;
        const [p, span] = root.children;

        span.prev = null;

        expect(checkStructure(root)).toEqual({
            kind: "prev",
            node: span,
            expected: p,
            actual: null,
        });
    });

    it("reports a parent mismatch at the corresponding node", () => {
        const root = parseDOM("<div><p></p><span></span></div>")[0] as Element;
        const [, span] = root.children;

        span.parent = null;

        expect(checkStructure(root)).toEqual({
            kind: "parent",
            node: span,
            expected: root,
            actual: null,
        });
    });

    it("terminates on a sibling cycle and reports the closing node", () => {
        const root = parseDOM(
            "<div><p></p><span></span><a></a></div>",
        )[0] as Element;
        const [p, , a] = root.children;

        // Close the chain back to the first sibling.
        a.next = p;

        expect(checkStructure(root)).toEqual({
            kind: "next",
            node: a,
            expected: null,
            actual: p,
        });
    });

    it("terminates on a parent-child cycle by node identity", () => {
        const root = parseDOM("<div><p></p></div>")[0] as Element;
        const p = root.children[0] as Element;

        // Point the child back at the root to form a cycle.
        p.children = [root];
        root.parent = p;

        expect(checkStructure(root)).toEqual({
            kind: "cycle",
            node: root,
        });
    });

    it("does not modify the tree", () => {
        const root = parseDOM(
            "<div><p></p><span></span><a></a></div>",
        )[0] as Element;
        const [p, span, a] = root.children;

        span.next = null;

        const before = {
            p: { next: p.next, prev: p.prev, parent: p.parent },
            span: { next: span.next, prev: span.prev, parent: span.parent },
            a: { next: a.next, prev: a.prev, parent: a.parent },
        };

        checkStructure(root);

        expect({
            p: { next: p.next, prev: p.prev, parent: p.parent },
            span: { next: span.next, prev: span.prev, parent: span.parent },
            a: { next: a.next, prev: a.prev, parent: a.parent },
        }).toEqual(before);

        // The corruption is still present; nothing was patched.
        expect(span.next).toBeNull();
        expect(checkStructure(root)).toEqual({
            kind: "next",
            node: span,
            expected: a,
            actual: null,
        });
    });
});
