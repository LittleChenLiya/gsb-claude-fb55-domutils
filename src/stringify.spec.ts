import { parseDocument } from "htmlparser2";
import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/fixture.js";
import {
    extractText,
    getInnerHTML,
    getOuterHTML,
    getText,
    innerText,
    textContent,
} from "./index.js";

// Mixed fixture: script/style subtrees, adjacent text, <br>, nested excludes.
const markup =
    "<div>before<script>var x = 1;</script>after<style>.a{}</style>end<br>" +
    "<span>line1<br/>line2</span><noscript>" +
    "<p>nested<script>ignore()</script>tail</p>" +
    "</noscript><!-- c --></div>";
const root = parseDocument(markup).children[0];
if (root.type !== "tag" || root.name !== "div") {
    throw new Error("Fixture root should be a <div>");
}

describe("stringify", () => {
    describe("getOuterHTML", () => {
        it("Correctly renders the outer HTML", () => {
            expect(getOuterHTML(fixture[1])).toBe(
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
        it("Skips script/style subtrees but keeps adjacent text (br collapsed)", () => {
            expect(extractText(root)).toBe(
                "beforeafterendline1line2nestedtail",
            );
        });

        it("Converts <br> to newlines only when brToNewline is enabled", () => {
            expect(extractText(root, { brToNewline: false })).toBe(
                "beforeafterendline1line2nestedtail",
            );
            expect(extractText(root, { brToNewline: true })).toBe(
                "beforeafterend\nline1\nline2nestedtail",
            );
        });

        it("Accepts configurable excluded tags (including nested excludes)", () => {
            expect(
                extractText(root, {
                    excludeTags: ["script", "style", "noscript"],
                }),
            ).toBe("beforeafterendline1line2");
            expect(extractText(root, { excludeTags: [] })).toBe(
                "beforevar x = 1;after.a{}endline1line2nestedignore()tail",
            );
        });

        it("Accepts arrays of nodes and joins the rendered text", () => {
            expect(extractText(root.children, { brToNewline: true })).toBe(
                "beforeafterend\nline1\nline2nestedtail",
            );
        });

        it("Does not modify the tree while traversing", () => {
            const before = getOuterHTML(root);
            const childCount = root.children.length;
            extractText(root, { brToNewline: true });
            extractText(root, { excludeTags: ["script", "style"] });
            expect(getOuterHTML(root)).toBe(before);
            expect(root.children.length).toBe(childCount);
        });

        it("Leaves textContent/getText/innerText behavior unchanged (regression)", () => {
            // Old APIs keep their original output for the same tree.
            expect(textContent(fixture[1])).toBe(" text   text ");
            expect(getText(fixture[1])).toBe(" text   text ");
            expect(innerText(fixture[1])).toBe("    text ");

            /*
             * Old APIs on the mixed fixture: textContent includes script/style
             * contents; innerText excludes them and has no newline for <br>;
             * getText includes the contents and inserts newlines for <br>.
             */
            expect(textContent(root)).toBe(
                "beforevar x = 1;after.a{}endline1line2nestedignore()tail",
            );
            expect(innerText(root)).toBe("beforeafterendline1line2nestedtail");
            expect(getText(root)).toBe(
                "beforevar x = 1;after.a{}end\nline1\nline2nestedignore()tail",
            );
        });
    });
});
