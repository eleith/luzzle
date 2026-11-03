import { expect, expectTypeOf, test } from "vitest";
import { Value } from "@sinclair/typebox/value";
import type { Config, ConfigPublic } from "./config.js";
import { validateConfig } from "./config.js";
import { ConfigError } from "./errors.js";
import { ConfigSchema, siteImageDefaults } from "./schema.js";
import { createInputSchema } from "./input-schema.js";

const inputSchema = createInputSchema(ConfigSchema);
const rawFont = (sans: unknown) => ({ content: { fonts: { sans } } });

const invalidFilenames = [
	"",
	" ",
	"\t\n",
	"font",
	"font.woff",
	"font.ttf",
	"font.otf",
	"font.png",
	"font.woff2.exe",
	".woff2",
	"./.woff2",
	"/content/.woff2",
	"font.woff2/",
	"font.woff2 ",
	"https://example.com/font.woff2",
	"HTTP://example.com/font.woff2",
	"ftp://example.com/font.woff2",
	"file:///tmp/font.woff2",
	"file:/tmp/font.woff2",
	"data:font/woff2;base64,font.woff2",
	"javascript:font.woff2",
	"custom+scheme:font.woff2",
	"1invalid://example.com/font.woff2",
	"invalid scheme://example.com/font.woff2",
	"./https://example.com/font.woff2",
	"//example.com/font.woff2",
	" //example.com/font.woff2",
	" https://example.com/font.woff2",
	"font.woff2?version=1",
	"font.woff2#fragment",
	"./query?directory/font.woff2",
	"./fragment#directory/font.woff2",
	"font\u0000.woff2",
	"font\u001f.woff2",
	"font\u007f.woff2",
	"font\u0085.woff2",
	"font\u009f.woff2",
	"font\t.woff2",
	"font\r.woff2",
	"font\n.woff2",
	"font.woff2\n",
	"font.woff2\r\n",
];

test.each([{}, { content: {} }, { content: { fonts: {} } }])(
	"defaults fonts to an independent empty object without changing the theme: %j",
	(raw) => {
		const original = structuredClone(raw);
		const config = validateConfig(raw, {});
		expect(config.content.fonts).toEqual({});
		expect(config.content.fonts).not.toHaveProperty("sans");
		expect(config.theme.globals["font-sans-url"]).toBe(
			'"/fonts/noto-sans.woff2"',
		);
		config.content.fonts.sans = "./selected.woff2";
		expect(validateConfig({}, {}).content.fonts).toEqual({});
		expect(raw).toEqual(original);
	},
);

test("resolved fonts are required but sans has no schema default", () => {
	const schema = ConfigSchema.properties.content.properties.fonts;
	expect(ConfigSchema.properties.content.required).toContain("fonts");
	expect(schema.default).toEqual({});
	expect(schema.required ?? []).not.toContain("sans");
	expect(schema.properties.sans).not.toHaveProperty("default");
	expect(Value.Default(schema, {})).toEqual({});
	expect(Value.Check(schema, {})).toBe(true);
	expectTypeOf<Config["content"]["fonts"]>().toEqualTypeOf<{ sans?: string }>();
	expectTypeOf<keyof ConfigPublic["content"]>().toEqualTypeOf<
		"text" | "images"
	>();
});

test.each(["woff2", "WOFF2", "WoFf2"])(
	"accepts local .%s filenames without reading or rebasing them",
	(extension) => {
		for (const filename of [
			`font.${extension}`,
			`./content/site fonts/font.${extension}`,
			`../fonts/font.${extension}`,
			`/app/content/site fonts/font.${extension}`,
		]) {
			const raw = rawFont(filename);
			const original = structuredClone(raw);
			expect(Value.Check(inputSchema, raw)).toBe(true);
			const config = validateConfig(raw, {});
			expect(config.content.fonts).toEqual({ sans: filename });
			expect(config.content.images).toEqual(siteImageDefaults);
			expect(config.content.text).toEqual(validateConfig({}, {}).content.text);
			expect(config.theme).toEqual(validateConfig({}, {}).theme);
			expect(raw).toEqual(original);
		}
	},
);

test("local font selection coexists with theme, text and image overrides", () => {
	const content = {
		fonts: { sans: "./font.woff2" },
		images: { favicon: "./icon.ico", opengraph: "./share.jpg" },
		text: { title: "Garden", description: "Notes" },
	};
	const theme = {
		globals: { "font-sans-url": '"https://cdn.test/font.woff2"' },
	};
	const config = validateConfig({ content, theme }, {});
	expect(config.content).toEqual(content);
	expect(config.theme.globals["font-sans-url"]).toBe(
		theme.globals["font-sans-url"],
	);
	expect(validateConfig({ theme }, {}).theme.globals["font-sans-url"]).toBe(
		theme.globals["font-sans-url"],
	);
});

test.each(invalidFilenames)(
	"rejects invalid raw and expanded font filename %j",
	(filename) => {
		expect(Value.Check(inputSchema, rawFont(filename))).toBe(false);
		expect(() => validateConfig(rawFont(filename), {})).toThrow(
			"/content/fonts/sans",
		);
		const raw = rawFont("${SANS_FONT}");
		expect(Value.Check(inputSchema, raw)).toBe(true);
		expect(() => validateConfig(raw, { SANS_FONT: filename })).toThrow(
			"/content/fonts/sans",
		);
	},
);

test.each([null, false, 42, [], {}, { filename: "./font.woff2" }])(
	"rejects non-string sans selections: %j",
	(sans) => {
		expect(() => validateConfig(rawFont(sans), {})).toThrow(ConfigError);
	},
);

test.each([null, false, 42, "./font.woff2", [], { serif: "./font.woff2" }])(
	"rejects malformed font sections and unknown keys: %j",
	(fonts) => {
		expect(() => validateConfig({ content: { fonts } }, {})).toThrow(
			ConfigError,
		);
	},
);

test.each([
	[
		"${SANS_FONT}",
		{ SANS_FONT: "/content/site font.WOFF2" },
		"/content/site font.WOFF2",
	],
	["${SANS_FONT:-./fallback.woff2}", {}, "./fallback.woff2"],
	[
		"${FONT_DIR}/font.${EXT}",
		{ FONT_DIR: "./site fonts", EXT: "woff2" },
		"./site fonts/font.woff2",
	],
	["./price$$5.woff2", {}, "./price$5.woff2"],
	["./$${LITERAL}.woff2", {}, "./${LITERAL}.woff2"],
] as const)("interpolates %s once", (source, env, expected) => {
	const raw = rawFont(source);
	const original = structuredClone(raw);
	expect(Value.Check(inputSchema, raw)).toBe(true);
	expect(validateConfig(raw, env).content.fonts).toEqual({ sans: expected });
	expect(raw).toEqual(original);
});

test("checks missing variables, empty fallbacks and expanded extensions", () => {
	expect(() => validateConfig(rawFont("${SANS_FONT}"), {})).toThrow(
		'/content/fonts/sans: Environment variable "SANS_FONT" is missing.',
	);
	for (const source of [
		"${SANS_FONT:-}",
		"${SANS_FONT:-https://example.com/font.woff2}",
	]) {
		expect(() => validateConfig(rawFont(source), {})).toThrow(ConfigError);
	}
	expect(() =>
		validateConfig(rawFont("./font.${EXT}"), { EXT: "ttf" }),
	).toThrow(ConfigError);
});
