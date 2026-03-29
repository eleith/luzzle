import { describe, it, expect } from "vitest";
import { route, getFrontmatterEndLine, shouldRespond } from "./luzzle-lsp.js";

describe("luzzle-lsp", () => {
	describe("route", () => {
		it("exports correct shape", () => {
			expect(route.name).toBe("luzzle-lsp");
			expect(route.command).toBe("luzzle-lsp");
			expect(route.args).toEqual(["--stdio"]);
			expect(route.shouldRespond).toBe(shouldRespond);
		});
	});

	describe("getFrontmatterEndLine", () => {
		it("returns -1 for documents with no frontmatter", () => {
			expect(getFrontmatterEndLine("# Hello")).toBe(-1);
			expect(getFrontmatterEndLine("")).toBe(-1);
		});

		it("returns the line of the closing ---", () => {
			expect(
				getFrontmatterEndLine("---\ntitle: Hello\n---\n# Heading"),
			).toBe(2);
			expect(getFrontmatterEndLine("---\n---\nContent")).toBe(1);
		});

		it("returns Infinity for unclosed frontmatter", () => {
			expect(getFrontmatterEndLine("---\ntitle: Hello\n")).toBe(Infinity);
			expect(getFrontmatterEndLine("---\n")).toBe(Infinity);
		});
	});

	describe("shouldRespond", () => {
		it("returns false when cursor is in markdown", () => {
			const text = "---\ntitle: Hello\n---\n# Heading\nText";
			expect(shouldRespond(text, { line: 3, character: 0 })).toBe(false);
			expect(shouldRespond(text, { line: 4, character: 5 })).toBe(false);
		});

		it("returns true when cursor is in frontmatter", () => {
			const text = "---\ntitle: Hello\n---\n# Heading";
			expect(shouldRespond(text, { line: 0, character: 0 })).toBe(true);
			expect(shouldRespond(text, { line: 1, character: 5 })).toBe(true);
			expect(shouldRespond(text, { line: 2, character: 0 })).toBe(true);
		});

		it("returns false when document has no frontmatter", () => {
			expect(shouldRespond("# Just markdown", { line: 0, character: 0 })).toBe(
				false,
			);
		});

		it("returns true when frontmatter is unclosed", () => {
			const text = "---\ntitle: Hello\n";
			expect(shouldRespond(text, { line: 1, character: 5 })).toBe(true);
			expect(shouldRespond(text, { line: 10, character: 0 })).toBe(true);
		});
	});
});
