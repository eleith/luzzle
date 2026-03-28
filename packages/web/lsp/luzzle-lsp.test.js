import { describe, it, expect } from "vitest";
import { route } from "./luzzle-lsp.js";

describe("luzzle-lsp", () => {
	describe("route", () => {
		it("exports correct shape", () => {
			expect(route).toEqual({
				name: "luzzle-lsp",
				command: "luzzle-lsp",
				args: ["--stdio"],
			});
		});
	});
});
