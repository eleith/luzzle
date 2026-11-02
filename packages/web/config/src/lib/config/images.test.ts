import { expect, expectTypeOf, test } from "vitest";
import { Value } from "@sinclair/typebox/value";
import type { Config, ConfigPublic } from "./config.js";
import { validateConfig } from "./config.js";
import { ConfigError } from "./errors.js";
import { ConfigSchema, siteImageDefaults } from "./schema.js";
import { createInputSchema } from "./input-schema.js";

const roles = ["favicon", "opengraph"] as const;
const inputSchema = createInputSchema(ConfigSchema);

function rawImage(role: (typeof roles)[number], filename: unknown) {
	return { content: { images: { [role]: filename } } };
}

const invalidFilenames = [
	"",
	" ",
	"\t\n",
	"image",
	"image.txt",
	"image.png.exe",
	".png",
	"./.png",
	"/content/.png",
	"image.png/",
	"image.png ",
	"https://example.com/image.png",
	"HTTP://example.com/image.png",
	"ftp://example.com/image.png",
	"file:///tmp/image.png",
	"file:/tmp/image.png",
	"data:image/png;base64,image.png",
	"javascript:image.png",
	"custom+scheme:image.png",
	"1invalid://example.com/image.png",
	"invalid scheme://example.com/image.png",
	" ://example.com/image.png",
	"./https://example.com/image.png",
	"//example.com/image.png",
	" //example.com/image.png",
	" https://example.com/image.png",
	"image.png?version=1",
	"image.png#fragment",
	"./query?directory/image.png",
	"./fragment#directory/image.png",
	"image\u0000.png",
	"image\u001f.png",
	"image\u007f.png",
	"image\u0085.png",
	"image\u009f.png",
	"image\t.png",
	"image\r.png",
	"image\n.png",
	"image.png\n",
	"image.png\r\n",
];

test.each([{}, { content: {} }, { content: { images: {} } }])(
	"defaults site images to built-in static sources: %j",
	(raw) => {
		const original = structuredClone(raw);
		expect(validateConfig(raw, {}).content.images).toEqual(siteImageDefaults);
		expect(raw).toEqual(original);
	},
);

test("image defaults are not shared between configurations", () => {
	const config = validateConfig({}, {});
	config.content.images.favicon = "./selected.png";
	expect(validateConfig({}, {}).content.images).toEqual(siteImageDefaults);
	expect(siteImageDefaults).toEqual({
		favicon: "/images/favicon.png",
		opengraph: "/images/opengraph.png",
	});
});

test.each(roles)(
	"allows %s independently without changing text defaults",
	(role) => {
		const raw = rawImage(role, "./missing images/selected.png");
		const original = structuredClone(raw);
		const config = validateConfig(raw, {});
		expect(config.content.images).toEqual({
			...siteImageDefaults,
			[role]: "./missing images/selected.png",
		});
		expect(config.content.text).toEqual(validateConfig({}, {}).content.text);
		expect(raw).toEqual(original);
	},
);

test("image defaults originate in the required resolved schema", () => {
	const schema = ConfigSchema.properties.content.properties.images;
	expect(schema.default).toEqual({});
	expect(schema.required).toEqual([...roles]);
	for (const role of roles) {
		expect(schema.properties[role].type).toBe("string");
		expect(schema.properties[role].default).toBe(siteImageDefaults[role]);
		expect(Value.Check(schema, { [role]: siteImageDefaults[role] })).toBe(
			false,
		);
	}
	expect(Value.Default(schema, {})).toEqual(siteImageDefaults);
	expect(Value.Check(schema, {})).toBe(false);
	expect(Value.Check(schema, siteImageDefaults)).toBe(true);
});

test.each(roles)("accepts the explicit built-in default for %s", (role) => {
	const raw = rawImage(role, siteImageDefaults[role]);
	const original = structuredClone(raw);
	expect(Value.Check(inputSchema, raw)).toBe(true);
	expect(validateConfig(raw, {}).content.images).toEqual(siteImageDefaults);
	expect(raw).toEqual(original);
});

test("accepts both explicit built-in defaults", () => {
	expect(
		validateConfig({ content: { images: { ...siteImageDefaults } } }, {})
			.content.images,
	).toEqual(siteImageDefaults);
});

test("accepts both selections alongside custom site text", () => {
	const content = {
		text: { title: "My garden", description: "Notes" },
		images: { favicon: "./icon.ico", opengraph: "/content/share.jpeg" },
	};
	expect(validateConfig({ content }, {}).content).toEqual(content);
});

for (const [role, extensions] of [
	["favicon", ["png", "svg", "ico"]],
	["opengraph", ["png", "jpg", "jpeg", "webp", "gif"]],
] as const) {
	test.each(extensions)(
		`accepts ${role} .%s case-insensitively`,
		(extension) => {
			for (const suffix of [
				extension,
				extension.toUpperCase(),
				extension[0].toUpperCase() + extension.slice(1),
			]) {
				for (const filename of [
					`image.${suffix}`,
					`./content/site images/image.${suffix}`,
					`../site images/image.${suffix}`,
					`/app/content/site images/image.${suffix}`,
				]) {
					expect(Value.Check(inputSchema, rawImage(role, filename))).toBe(true);
					expect(
						validateConfig(rawImage(role, filename), {}).content.images,
					).toEqual({
						...siteImageDefaults,
						[role]: filename,
					});
				}
			}
		},
	);
}

test.each([
	["favicon", "image.jpg"],
	["favicon", "image.jpeg"],
	["favicon", "image.webp"],
	["favicon", "image.gif"],
	["opengraph", "image.svg"],
	["opengraph", "image.ico"],
] as const)("rejects unsupported %s type %s", (role, filename) => {
	expect(() => validateConfig(rawImage(role, filename), {})).toThrow(
		ConfigError,
	);
	expect(() =>
		validateConfig(rawImage(role, "${SITE_IMAGE}"), { SITE_IMAGE: filename }),
	).toThrow(ConfigError);
});

test.each(invalidFilenames)(
	"rejects invalid local image filename %j",
	(filename) => {
		for (const role of roles) {
			const raw = rawImage(role, filename);
			expect(Value.Check(inputSchema, raw)).toBe(false);
			expect(() => validateConfig(raw, {})).toThrow(`/content/images/${role}`);
		}
	},
);

test.each([null, false, 42, [], {}, { filename: "./image.png" }])(
	"rejects non-string image filenames: %j",
	(filename) => {
		for (const role of roles) {
			expect(() => validateConfig(rawImage(role, filename), {})).toThrow(
				ConfigError,
			);
		}
	},
);

test.each([null, false, "./image.png", [], { unknown: "./image.png" }])(
	"rejects malformed image sections and unknown selections: %j",
	(images) => {
		expect(() => validateConfig({ content: { images } }, {})).toThrow(
			ConfigError,
		);
	},
);

test.each(roles)(
	"interpolates literal environment references for %s",
	(role) => {
		for (const [filename, env, expected] of [
			[
				"${SITE_IMAGE}",
				{ SITE_IMAGE: "/content/site image.PNG" },
				"/content/site image.PNG",
			],
			["${SITE_IMAGE:-./fallback.png}", {}, "./fallback.png"],
			[
				"${SITE_IMAGE}",
				{ SITE_IMAGE: siteImageDefaults[role] },
				siteImageDefaults[role],
			],
			[
				"${IMAGE_DIR}/image.${EXT}",
				{ IMAGE_DIR: "./site images", EXT: "png" },
				"./site images/image.png",
			],
			["./${NAME}.png", { NAME: "site image" }, "./site image.png"],
			["./price$$5.png", {}, "./price$5.png"],
			["./$${LITERAL}.png", {}, "./${LITERAL}.png"],
		] as const) {
			const raw = rawImage(role, filename);
			const original = structuredClone(raw);
			expect(Value.Check(inputSchema, raw)).toBe(true);
			expect(validateConfig(raw, env).content.images).toEqual({
				...siteImageDefaults,
				[role]: expected,
			});
			expect(raw).toEqual(original);
		}
	},
);

test.each(invalidFilenames)(
	"rejects invalid expanded image filename %j",
	(filename) => {
		for (const role of roles) {
			const raw = rawImage(role, "${SITE_IMAGE}");
			expect(Value.Check(inputSchema, raw)).toBe(true);
			expect(() => validateConfig(raw, { SITE_IMAGE: filename })).toThrow(
				`/content/images/${role}`,
			);
		}
	},
);

test.each(roles)("checks %s extensions after expansion", (role) => {
	expect(() =>
		validateConfig(rawImage(role, "./image.${EXT}"), { EXT: "txt" }),
	).toThrow(ConfigError);
	expect(() => validateConfig(rawImage(role, "${SITE_IMAGE:-}"), {})).toThrow(
		ConfigError,
	);
	expect(() =>
		validateConfig(
			rawImage(role, "${SITE_IMAGE:-https://example.com/image.png}"),
			{},
		),
	).toThrow(ConfigError);
	expect(() =>
		validateConfig(rawImage(role, "https://${HOST}/image.png"), {
			HOST: "example.com",
		}),
	).toThrow(ConfigError);
	expect(() => validateConfig(rawImage(role, "${SITE_IMAGE}"), {})).toThrow(
		`/content/images/${role}: Environment variable "SITE_IMAGE" is missing.`,
	);
});

test("public content requires both resolved image URLs", () => {
	expectTypeOf<ConfigPublic["content"]>().toEqualTypeOf<{
		text: Config["content"]["text"];
		images: { favicon: string; opengraph: string };
	}>();
	const content: ConfigPublic["content"] = {
		text: { title: "My garden", description: "Notes" },
		images: {
			favicon: "/site-assets/favicon",
			opengraph: "/site-assets/opengraph",
		},
	};
	expect(content.images.favicon).toBe("/site-assets/favicon");
	// @ts-expect-error Consumers must receive defaults, not infer absent selections.
	const incomplete: ConfigPublic["content"] = { text: content.text };
	expect(incomplete).not.toHaveProperty("images");
});
