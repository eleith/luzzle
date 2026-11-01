import { expect, test } from "vitest";
import { validateConfig } from "./config.js";

const defaultErrors = {
	"404": { home: true },
	"4xx": { home: true },
	"500": { home: true },
};
const errorSlots = ["404", "4xx", "500"] as const;

test("site pages default without Markdown bodies or a feed explanation", () => {
	expect(validateConfig({}, {}).pages).toEqual({
		home: { latest: true, random: false },
		feed: { links: true },
		error: defaultErrors,
	});
});

test("site sections accept Markdown file references and independent booleans", () => {
	const pages = {
		home: { body: "./home.md", latest: false, random: true },
		feed: { about: "./feed.md", links: false },
		error: {
			"404": { body: "./not-found.md", home: false },
			"4xx": { body: "./client-error.md", home: true },
			"500": { body: "./server-error.md", home: false },
		},
	};
	expect(validateConfig({ pages }, {}).pages).toEqual(pages);
});

test.each([{}, { error: {} }, { error: { "404": {}, "4xx": {}, "500": {} } }])(
	"defaults empty error settings independently: %j",
	(pages) => {
		expect(validateConfig({ pages }, {}).pages.error).toEqual(defaultErrors);
	},
);

test.each(errorSlots)(
	"defaults home for a body-only %s presentation",
	(slot) => {
		expect(
			validateConfig(
				{ pages: { error: { [slot]: { body: "./error.md" } } } },
				{},
			).pages.error,
		).toEqual({ ...defaultErrors, [slot]: { body: "./error.md", home: true } });
	},
);

test.each(errorSlots)("keeps the %s home toggle independent", (slot) => {
	for (const home of [false, true]) {
		const error = Object.fromEntries(
			errorSlots.map((key) => {
				const showHome = key === slot ? home : !home;
				return [key, { home: showHome }];
			}),
		);
		expect(validateConfig({ pages: { error } }, {}).pages.error).toEqual(error);
	}
});

test("error body filenames use ordinary shared config environment interpolation", () => {
	expect(
		validateConfig(
			{ pages: { error: { "404": { body: "${ERROR_BODY}" } } } },
			{ ERROR_BODY: "./not-found.md" },
		).pages.error["404"],
	).toEqual({ body: "./not-found.md", home: true });
	expect(() =>
		validateConfig(
			{ pages: { error: { "404": { body: "${ERROR_BODY}" } } } },
			{ ERROR_BODY: "" },
		),
	).toThrow();
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

test.each([null, false, "./error.md", [], { "403": {} }, { "5xx": {} }])(
	"rejects malformed error sections and unknown presentation keys: %j",
	(error) => {
		expect(() => validateConfig({ pages: { error } }, {})).toThrow();
	},
);

test.each([
	null,
	false,
	"./error.md",
	[],
	{ body: "" },
	{ body: null },
	{ body: true },
	{ body: 404 },
	{ body: { markdownFile: "./error.md" } },
	{ home: null },
	{ home: "false" },
	{ home: 0 },
	{ home: { enabled: true } },
	{ unknown: true },
])("rejects malformed settings in every error presentation: %j", (settings) => {
	for (const slot of errorSlots) {
		expect(() =>
			validateConfig({ pages: { error: { [slot]: settings } } }, {}),
		).toThrow();
	}
});
