import {
    type AnyNode,
    type Element,
    hasChildren,
    isComment,
    isText,
    type Text,
} from "domhandler";
import { parseDocument } from "htmlparser2";
import { describe, expect, it } from "vitest";
import {
    append,
    appendChild,
    cloneNode,
    prepend,
    prependChild,
    removeElement,
    replaceElement,
} from "./manipulation.js";

function parseDOM(markup: string) {
    return parseDocument(markup).children;
}

/*
 * Three layers of mixed nodes (element / comment / text), with an external
 * sibling that must never enter the cloned tree.
 */
function parseMixedCloneFixture() {
    const document = parseDocument(
        "<div><p>before<!--note--><b>bold</b>after</p><span>external sibling</span></div>",
    );
    const div = document.children[0] as Element;
    const p = div.children[0] as Element;
    const external = div.children[1] as Element;

    return { div, p, external };
}

describe("manipulation", () => {
    describe("append", () => {
        it("should not be duplicated when called twice", () => {
            const dom = parseDOM(
                "<div><p><img/></p><p><object/></p></div>",
            )[0] as Element;
            const child = parseDOM("<span></span>")[0] as Element;
            const parents = dom.children as Element[];
            append(parents[0].children[0], child);

            expect(dom).toMatchInlineSnapshot(`
                <div>
                  <p>
                    <img />
                    <span />
                  </p>
                  <p>
                    <object />
                  </p>
                </div>
            `);

            append(parents[1].children[0], child);
            expect(parents[0].children).toHaveLength(1);
            expect(parents[1].children).toHaveLength(2);

            expect(dom).toMatchInlineSnapshot(`
                <div>
                  <p>
                    <img />
                  </p>
                  <p>
                    <object />
                    <span />
                  </p>
                </div>
            `);
        });
    });
    describe("appendChild", () => {
        it("should not be duplicated when called twice", () => {
            const dom = parseDOM(
                "<div><p><img/></p><p><object/></p></div>",
            )[0] as Element;
            const child = parseDOM("<span></span>")[0] as Element;
            const parents = dom.children as Element[];

            appendChild(parents[0], child);

            expect(dom).toMatchInlineSnapshot(`
                <div>
                  <p>
                    <img />
                    <span />
                  </p>
                  <p>
                    <object />
                  </p>
                </div>
            `);

            appendChild(parents[1], child);

            expect(parents[0].children).toHaveLength(1);
            expect(parents[1].children).toHaveLength(2);

            expect(dom).toMatchInlineSnapshot(`
                <div>
                  <p>
                    <img />
                  </p>
                  <p>
                    <object />
                    <span />
                  </p>
                </div>
            `);
        });
    });
    describe("removeElement", () => {
        it("should correctly remove element", () => {
            const dom = parseDOM(
                "<div><p><img/><object/></p><p></p></div>",
            )[0] as Element;
            const parents = dom.children as Element[];

            const image = parents[0].children[0];

            removeElement(image);

            expect(image.next).toBeNull();
            expect(image.prev).toBeNull();
            expect(image.parent).toBeNull();

            expect(dom).toMatchInlineSnapshot(`
                <div>
                  <p>
                    <object />
                  </p>
                  <p />
                </div>
            `);

            appendChild(parents[1], image);

            expect(parents[0].children).toHaveLength(1);
            expect(parents[1].children).toHaveLength(1);

            expect(dom).toMatchInlineSnapshot(`
                <div>
                  <p>
                    <object />
                  </p>
                  <p>
                    <img />
                  </p>
                </div>
            `);
        });
    });
    describe("prepend", () => {
        it("should not be duplicated when called twice", () => {
            const dom = parseDOM(
                "<div><p><img/></p><p><object/></p></div>",
            )[0] as Element;
            const child = parseDOM("<span></span>")[0] as Element;
            const parents = dom.children as Element[];
            prepend(parents[0].children[0], child);

            expect(dom).toMatchInlineSnapshot(`
                <div>
                  <p>
                    <span />
                    <img />
                  </p>
                  <p>
                    <object />
                  </p>
                </div>
            `);

            prepend(parents[1].children[0], child);
            expect(parents[0].children).toHaveLength(1);
            expect(parents[1].children).toHaveLength(2);

            expect(dom).toMatchInlineSnapshot(`
                <div>
                  <p>
                    <img />
                  </p>
                  <p>
                    <span />
                    <object />
                  </p>
                </div>
            `);
        });
    });
    describe("prependChild", () => {
        it("should not be duplicated when called twice", () => {
            const dom = parseDOM(
                "<div><p><img/></p><p><object/></p></div>",
            )[0] as Element;
            const child = parseDOM("<span></span>")[0] as Element;
            const parents = dom.children as Element[];
            prependChild(parents[0], child);

            expect(dom).toMatchInlineSnapshot(`
                <div>
                  <p>
                    <span />
                    <img />
                  </p>
                  <p>
                    <object />
                  </p>
                </div>
            `);

            prependChild(parents[1], child);
            expect(parents[0].children).toHaveLength(1);
            expect(parents[1].children).toHaveLength(2);

            expect(dom).toMatchInlineSnapshot(`
                <div>
                  <p>
                    <img />
                  </p>
                  <p>
                    <span />
                    <object />
                  </p>
                </div>
            `);
        });
    });
    describe("replaceElement", () => {
        it("should allow replaced elements to be appended later (#966)", () => {
            const div = parseDOM("<div><p>")[0] as Element;
            const template = parseDOM("<template></template>")[0] as Element;
            const p = div.children[0];

            // We want to wrap the inner <p> in a <template>
            replaceElement(p, template);
            appendChild(template, p);

            expect(div).toMatchInlineSnapshot(`
                <div>
                  <template>
                    <p />
                  </template>
                </div>
            `);
        });
    });
    describe("cloneNode (default interface)", () => {
        it("should shallow-clone by default, keeping the original interface", () => {
            const div = parseDOM("<div><span>hello</span></div>")[0] as Element;
            const clone = cloneNode(div);

            expect(clone).not.toBe(div);
            expect(clone.name).toBe("div");
            // Shallow clone: no children copied.
            expect(clone.children).toHaveLength(0);
            expect(clone.parent).toBeNull();
            expect(clone.prev).toBeNull();
            expect(clone.next).toBeNull();
            // The original tree is untouched.
            expect(div.children).toHaveLength(1);
        });

        it("should deep-clone when recursive is true", () => {
            const div = parseDOM("<div><span>hello</span></div>")[0] as Element;
            const clone = cloneNode(div, true) as Element;

            expect(clone).not.toBe(div);
            expect(clone.children).toHaveLength(1);
            expect(clone.children[0]).not.toBe(div.children[0]);
            expect(clone.children[0].parent).toBe(clone);
            const clonedSpan = clone.children[0] as Element;
            expect((clonedSpan.children[0] as Text).data).toBe("hello");
        });

        it("should stay backward compatible with { nodeMap: false }", () => {
            const text = parseDOM("hello")[0] as Text;
            const clone = cloneNode(text, { nodeMap: false });

            // Same return shape as the legacy interface: the node itself.
            expect(clone).not.toBe(text);
            expect(clone.data).toBe("hello");
        });
    });
    describe("cloneNode ({ nodeMap: true })", () => {
        it("should map every cloned node including text and comments", () => {
            const { p } = parseMixedCloneFixture();
            const { clone, nodeMap } = cloneNode(p, { nodeMap: true });

            expect(clone).not.toBe(p);
            /* P, text "before", comment, b, text "bold", text "after" */
            expect(nodeMap.size).toBe(6);
            expect(nodeMap.get(p)).toBe(clone);

            for (const [original, mapped] of nodeMap) {
                expect(mapped).not.toBe(original);
                expect(mapped.type).toBe(original.type);
                expect(nodeMap.has(mapped)).toBe(false);
            }

            const originalNodes: AnyNode[] = [];
            const walk = (node: AnyNode): void => {
                originalNodes.push(node);
                if (hasChildren(node)) {
                    for (const child of node.children) walk(child);
                }
            };
            walk(p);
            expect(originalNodes).toHaveLength(6);
            for (const node of originalNodes) {
                expect(nodeMap.has(node)).toBe(true);
            }

            const clonedP = clone as Element;
            const originalComment = p.children[1];
            const clonedComment = nodeMap.get(originalComment);
            expect(clonedComment).toBe(clonedP.children[1]);
            expect(isComment(originalComment)).toBe(true);
            expect(clonedComment ? isComment(clonedComment) : false).toBe(true);

            const textNodes = originalNodes.filter(isText);
            expect(textNodes).toHaveLength(3);
            for (const textNode of textNodes) {
                const mapped = nodeMap.get(textNode) as Text;
                expect(isText(mapped)).toBe(true);
                expect(mapped.data).toBe(textNode.data);
            }
        });

        it("should only point parent/sibling links into the cloned tree", () => {
            const { div, p, external } = parseMixedCloneFixture();
            const { clone, nodeMap } = cloneNode(p, { nodeMap: true });

            expect(p.parent).toBe(div);
            expect(p.next).toBe(external);
            expect(external.prev).toBe(p);

            // The cloned root is detached: no links back to the original tree.
            expect(clone.parent).toBeNull();
            expect(clone.prev).toBeNull();
            expect(clone.next).toBeNull();

            /* External sibling is not part of the result. */
            expect(nodeMap.has(external)).toBe(false);
            expect(nodeMap.has(div)).toBe(false);

            /*
             * Every mapped link (parent/prev/next) points to a mapped node or
             * is null (only allowed for the detached root / edges).
             */
            const clonedNodes = new Set(nodeMap.values());
            for (const [original, mapped] of nodeMap) {
                expect(
                    mapped.parent === null || clonedNodes.has(mapped.parent),
                ).toBe(true);
                expect(
                    mapped.prev === null || clonedNodes.has(mapped.prev),
                ).toBe(true);
                expect(
                    mapped.next === null || clonedNodes.has(mapped.next),
                ).toBe(true);

                // Sibling order mirrors the original tree.
                expect(mapped.prev).toBe(
                    original.prev ? (nodeMap.get(original.prev) ?? null) : null,
                );
                expect(mapped.next).toBe(
                    original.next ? (nodeMap.get(original.next) ?? null) : null,
                );
                if (
                    original.parent &&
                    // The cloned root's parent is intentionally null.
                    nodeMap.has(original.parent)
                ) {
                    expect(mapped.parent).toBe(nodeMap.get(original.parent));
                }
            }
        });

        it("should allow replacing text and moving children without affecting the original", () => {
            const { p } = parseMixedCloneFixture();
            const { clone, nodeMap } = cloneNode(p, { nodeMap: true });
            const clonedP = clone as Element;

            /*
             * Replace the text of the first ("before") and last ("after")
             * mapped text nodes.
             */
            const originalBefore = p.children[0] as Text;
            const originalAfter = p
                .children[3] as Text; /* Skip comment + <b>. */
            (nodeMap.get(originalBefore) as Text).data = "BEFORE*";
            (nodeMap.get(originalAfter) as Text).data = "AFTER*";

            // Move the cloned <b> from the middle to the end of the cloned <p>.
            const originalB = p.children[2] as Element;
            const clonedB = nodeMap.get(originalB) as Element;
            appendChild(clonedP, clonedB);

            expect(clonedP).toMatchInlineSnapshot(`
              <p>
                BEFORE*
                <!--note-->
                AFTER*
                <b>
                  bold
                </b>
              </p>
            `);

            // The original tree is untouched by both operations.
            expect(p).toMatchInlineSnapshot(`
              <p>
                before
                <!--note-->
                <b>
                  bold
                </b>
                after
              </p>
            `);

            // Moved node keeps consistent links, entirely inside the clone.
            expect(clonedB.parent).toBe(clonedP);
            expect(clonedB.next).toBeNull();
            expect(clonedB.prev).toBe(nodeMap.get(originalAfter) ?? null);
            expect(nodeMap.get(originalAfter)).toBe(clonedB.prev);

            // Original <b> stayed in place.
            const originalComment = p.children[1];
            expect(originalB.parent).toBe(p);
            expect(originalB.prev).toBe(originalComment);
            expect(originalB.next).toBe(originalAfter);
        });

        it("should deep-clone a text node on its own", () => {
            const text = parseDocument("standalone text").children[0] as Text;
            const { clone, nodeMap } = cloneNode(text, { nodeMap: true });

            expect(clone).not.toBe(text);
            expect(clone.data).toBe("standalone text");
            expect(nodeMap.get(text)).toBe(clone);
            expect(nodeMap.size).toBe(1);
        });
    });
});
