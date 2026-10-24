import { expect, test } from "vitest";
import { validateConfig } from "./config.js";

test("site pages have flat default settings and no default feed explanation", () => {
	expect(validateConfig({}, {}).pages).toEqual({
		home: { latest: true, random: false },
		feed: { links: true },
	});
});

test("site sections accept Markdown file references and independent booleans", () => {
	const pages = {
		home: { body: "./home.md", latest: false, random: true },
		feed: { about: "./feed.md", links: false },
	};
	expect(validateConfig({ pages }, {}).pages).toEqual(pages);
});

test.each([
	{ home: { latest: { enabled: true } } },
	{ home: { body: { markdownFile: "./home.md" } } },
	{ home: { body: "" } },
	{ feed: { about: true } },
	{ feed: { about: false } },
	{ feed: { links: "./feed.md" } },
])(
	"rejects nested section options and boolean feed explanations: %j",
	(pages) => {
		expect(() => validateConfig({ pages }, {})).toThrow();
	},
);
