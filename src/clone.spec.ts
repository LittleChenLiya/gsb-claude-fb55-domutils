import type { AnyNode, Comment, Element, Text } from "domhandler";
import { parseDocument } from "htmlparser2";
import { describe, expect, it } from "vitest";
import { cloneNode } from "./clone.js";
import { appendChild, removeElement } from "./manipulation.js";

/**
 * Three-level mixed tree:
 * div (level 1) > text / comment / span (level 2) > text / b (level 3) > text,
 * plus an external sibling `<p>` that must not enter the clone.
 */
function parseFixture() {
    const document = parseDocument(
        '<div id="root">hello<!--note--><span>inner<b>deep</b></span>tail</div><p id="outside">external</p>',
    );
    return {
        document,
        root: document.children[0] as Element,
        outside: document.children[1] as Element,
    };
}

function label(node: AnyNode): string {
    if ("data" in node) {
        return `${node.type}(${JSON.stringify(node.data)})`;
    }

    if ("name" in node) {
        return `${node.type}(${node.name})`;
    }

    return node.type;
}

describe("cloneNode", () => {
    describe("with node mapping", () => {
        it("should clone a three-level mixed tree with an old-to-new node map", () => {
            const { document, root, outside } = parseFixture();
            const { node: clone, map } = cloneNode(root, {
                recursive: true,
                withMapping: true,
            });

            // The map covers all 8 nodes of the subtree, incl. text & comments.
            expect(map.size).toBe(8);
            expect(map.get(root)).toBe(clone);

            const originalText = root.children[0] as Text;
            const originalComment = root.children[1] as Comment;
            const originalSpan = root.children[2] as Element;
            const originalDeep = (originalSpan.children[1] as Element)
                .children[0] as Text;

            const clonedText = map.get(originalText) as Text;
            const clonedComment = map.get(originalComment) as Comment;
            const clonedSpan = map.get(originalSpan) as Element;
            const clonedDeep = map.get(originalDeep) as Text;

            // Text and comment ownership: mapped clones carry the same data.
            expect(clonedText.data).toBe("hello");
            expect(clonedComment.data).toBe("note");
            expect(clonedDeep.data).toBe("deep");
            expect(clonedText).not.toBe(originalText);
            expect(clonedComment).not.toBe(originalComment);

            // Clone links only point into the clone tree; no external links.
            expect(clone.parent).toBeNull();
            expect(clone.prev).toBeNull();
            expect(clone.next).toBeNull();
            expect(clonedText.parent).toBe(clone);
            expect(clonedText.next).toBe(clonedComment);
            expect(clonedComment.prev).toBe(clonedText);
            expect(clonedComment.next).toBe(clonedSpan);
            expect(clonedSpan.parent).toBe(clone);

            // The external sibling does not enter the clone result.
            expect(map.has(outside)).toBe(false);
            expect(map.has(document)).toBe(false);
            expect(clone.children).toHaveLength(4);

            // Replace text in the clone; the original tree is unaffected.
            clonedText.data = "replaced";
            clonedComment.data = "rewritten";
            expect(originalText.data).toBe("hello");
            expect(originalComment.data).toBe("note");

            // Move a child within the clone; the original keeps its structure.
            removeElement(clonedSpan);
            appendChild(clone, clonedSpan);
            expect(clone.children[3]).toBe(clonedSpan);
            expect(clonedSpan.parent).toBe(clone);
            expect(root.children[2]).toBe(originalSpan);
            expect(root.children).toHaveLength(4);

            // Both sides' links stay consistent; original tree is untouched.
            expect(root.parent).toBe(document);
            expect(root.next).toBe(outside);
            expect(outside.prev).toBe(root);
            expect(originalSpan.parent).toBe(root);

            // Show the actual mapping for manual verification.
            console.log(
                "node map:",
                [...map.entries()]
                    .map(([from, to]) => `${label(from)} -> ${label(to)}`)
                    .join("\n  "),
            );
        });
    });

    describe("default interface (regression)", () => {
        it("should shallow-clone by default, without children or links", () => {
            const { root } = parseFixture();
            const clone = cloneNode(root);

            expect(clone).toBeInstanceOf(Object);
            expect(clone.name).toBe("div");
            expect(clone.attribs).toStrictEqual({ id: "root" });
            expect(clone.attribs).not.toBe(root.attribs);
            expect(clone.children).toHaveLength(0);
            expect(clone.parent).toBeNull();
            expect(clone.prev).toBeNull();
            expect(clone.next).toBeNull();
        });

        it("should deep-clone with the boolean `recursive` argument", () => {
            const { root } = parseFixture();
            const clone = cloneNode(root, true);

            expect(clone.children).toHaveLength(4);
            expect((clone.children[0] as Text).data).toBe("hello");
            expect((clone.children[1] as Comment).data).toBe("note");
            expect(clone.children[0].parent).toBe(clone);

            // Modifying the clone does not affect the original tree.
            clone.attribs["id"] = "changed";
            (clone.children[0] as Text).data = "mutated";
            expect(root.attribs["id"]).toBe("root");
            expect((root.children[0] as Text).data).toBe("hello");
        });

        it("should return the node directly when `withMapping` is not enabled", () => {
            const { root } = parseFixture();

            const shallow = cloneNode(root, {});
            expect(shallow.name).toBe("div");
            expect(shallow.children).toHaveLength(0);

            const deep = cloneNode(root, { recursive: true });
            expect(deep.children).toHaveLength(4);

            const noMapping = cloneNode(root, {
                recursive: true,
                withMapping: false,
            });
            expect(noMapping.children).toHaveLength(4);
        });
    });
});
