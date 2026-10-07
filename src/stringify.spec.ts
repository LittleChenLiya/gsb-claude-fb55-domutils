import renderHTML from "dom-serializer";
import { parseDocument } from "htmlparser2";
import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/fixture.js";
import {
    extractText,
    getInnerHTML,
    getOuterHTML as getOuterHTMLDeprecated,
    getText,
    innerText,
    textContent,
} from "./index.js";

describe("stringify", () => {
    describe("getOuterHTML", () => {
        it("Correctly renders the outer HTML", () => {
            expect(getOuterHTMLDeprecated(fixture[1])).toBe(
                '<tag1 id="asdf" class="class1"> <script>text</script> <!-- comment --> <tag2> text </tag2></tag1>',
            );
        });
    });

    describe("getInnerHTML", () => {
        it("Correctly renders the inner HTML", () => {
            expect(getInnerHTML(fixture[1])).toBe(
                " <script>text</script> <!-- comment --> <tag2> text </tag2>",
            );
        });
    });

    describe("getText", () => {
        it("Correctly renders the text content", () => {
            expect(getText(fixture[1])).toBe(" text   text ");
        });
    });

    describe("textContent", () => {
        it("Correctly renders the text content", () => {
            expect(textContent(fixture[1])).toBe(" text   text ");
        });
    });

    describe("innerText", () => {
        it("Correctly renders the text content", () => {
            expect(innerText(fixture[1])).toBe("    text ");
        });
    });

    describe("extractText", () => {
        const markup =
            "<div>before<script>var x = 1;</script> mid " +
            "<style>.a { color: red; }</style>line1<br>line2" +
            "<aside>hidden<span>nested</span></aside>after</div>";

        it("Skips script/style subtrees but keeps adjacent text by default", () => {
            const div = parseDocument(markup).children[0];
            expect(extractText(div)).toBe(
                "before mid line1line2hiddennestedafter",
            );
        });

        it("Supports configurable excluded elements, including nested ones", () => {
            const div = parseDocument(markup).children[0];
            expect(
                extractText(div, {
                    excludeTags: ["script", "style", "aside", "span"],
                }),
            ).toBe("before mid line1line2after");
        });

        it("Keeps <br> as-is unless brToNewline is enabled", () => {
            const excludeTags = ["script", "style", "aside"];
            const withoutNewlines = parseDocument(markup).children[0];
            expect(extractText(withoutNewlines, { excludeTags })).toBe(
                "before mid line1line2after",
            );
            const withNewlines = parseDocument(markup).children[0];
            expect(
                extractText(withNewlines, { excludeTags, brToNewline: true }),
            ).toBe("before mid line1\nline2after");
        });

        it("Does not modify the tree and leaves the legacy APIs unchanged", () => {
            const dom = parseDocument(markup);
            const div = dom.children[0];
            const before = renderHTML(dom);

            // Short regression example for the original interfaces.
            expect(textContent(div)).toBe(
                "beforevar x = 1; mid .a { color: red; }line1line2hiddennestedafter",
            );
            expect(innerText(div)).toBe(
                "before mid line1line2hiddennestedafter",
            );
            expect(getText(div)).toBe(
                "beforevar x = 1; mid .a { color: red; }line1\nline2hiddennestedafter",
            );

            // The default extraction matches `innerText` on this fixture.
            expect(extractText(div)).toBe(innerText(div));

            // The traversal does not modify the tree.
            expect(renderHTML(dom)).toBe(before);
            expect(renderHTML(dom)).toBe(markup);
        });
    });
});
