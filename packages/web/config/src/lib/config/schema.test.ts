import { expect, test } from "vitest";
import { Type } from "@sinclair/typebox";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ConfigError } from "./errors.js";
import {
	ConfigSchema,
	createPiecesSchema,
	PieceConfigSchema,
	siteImageDefaults,
} from "./schema.js";
import { loadConfig, validateConfig } from "./config.js";

const schema = Type.Object(
	{
		...ConfigSchema.properties,
		instance: Type.String({ default: "demo" }),
		pieces: createPiecesSchema(
			Type.Object(
				{
					...PieceConfigSchema.properties,
					badge: Type.String({ default: "new" }),
				},
				{ additionalProperties: false },
			),
		),
	},
	{ additionalProperties: false },
);

const piece = {
	fields: { title: "name", date_consumed: "date" },
};

test("consumers can supply complete extended schemas with their own defaults", () => {
	const config = validateConfig({ pieces: { records: piece } }, {}, { schema });
	expect(config.pieces.records.badge).toBe("new");
});

test("piece overrides preserve other record defaults, including prototype-named keys", () => {
	const defaults = {
		["__proto__"]: piece,
		book: { ...piece, badge: "default" },
	};
	const extended = Type.Object({
		...schema.properties,
		pieces: { ...schema.properties.pieces, default: defaults },
	});
	const raw = {
		pieces: { book: { ...piece, badge: "override" }, constructor: piece },
	};
	const config = validateConfig(raw, {}, { schema: extended });
	expect(config.pieces).toEqual({
		["__proto__"]: { ...piece, badge: "new" },
		book: { ...piece, badge: "override" },
		constructor: { ...piece, badge: "new" },
	});
	expect(defaults["__proto__"]).not.toHaveProperty("badge");
});

test("attachment highlighting requires explicit selectors", () => {
	const fields = { ...piece.fields, attachments: ["files[*].file"] };
	const config = validateConfig(
		{ pieces: { records: { ...piece, fields } } },
		{},
	);
	expect(config.pieces.records.fields.highlight).toBeUndefined();

	const selected = validateConfig(
		{
			pieces: {
				records: {
					...piece,
					fields: { ...fields, highlight: ["files[*].file"] },
				},
			},
		},
		{},
	);
	expect(selected.pieces.records.fields.highlight).toEqual(["files[*].file"]);
});

test("loading defaults preserves the supplied schema and base config contract", () => {
	const config = loadConfig(undefined, { schema });
	expect(config.instance).toBe("demo");
	expect(config.paths).toBeDefined();
	expect(config.pieces).toEqual({});
});

test("schema constraints also apply to the recorded configuration filename", () => {
	const directory = mkdtempSync(path.join(tmpdir(), "luzzle-schema-"));
	const filename = path.join(directory, "config.yaml");
	const constrained = Type.Object(
		{
			...ConfigSchema.properties,
			paths: Type.Object(
				{
					...ConfigSchema.properties.paths.properties,
					config: Type.Optional(Type.Literal("fixed")),
				},
				{ default: {}, additionalProperties: false },
			),
		},
		{ additionalProperties: false },
	);
	try {
		writeFileSync(filename, "{}");
		expect(() => loadConfig(filename, { schema: constrained })).toThrow(
			ConfigError,
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test("retired per-piece source components are rejected rather than ignored", () => {
	expect(() =>
		validateConfig({
			pieces: { records: { ...piece, components: { icon: "owned.svelte" } } },
		}),
	).toThrow(ConfigError);
});

test("site identity text remains configurable without source settings", () => {
	const content = {
		text: { title: "My garden", description: "Notes and records" },
	};
	expect(validateConfig({ content }, {}).content).toEqual({
		...content,
		fonts: {},
		images: siteImageDefaults,
	});
	expect(validateConfig({}, {}).content).toEqual({
		fonts: {},
		images: siteImageDefaults,
		text: {
			title: "Luzzle Explorer",
			description: "A Luzzle Explorer instance",
		},
	});
	expect(validateConfig({}, {}).paths).not.toHaveProperty("prepared");
});

test.each([
	{},
	{ root: "./missing.svelte" },
	{ feed: "./missing.svelte" },
	{ "404": "./missing.svelte" },
	{ error: "./missing.svelte" },
	{ unknown: "./missing.svelte" },
	{ root: "" },
	{ feed: "" },
	{ "404": "" },
	{ error: "" },
	{ unknown: "" },
	"",
	null,
])(
	"rejects retired content.component rather than ignoring it: %j",
	(component) => {
		const raw = { content: { component } };
		for (const validate of [
			() => validateConfig(raw, {}),
			() => validateConfig(raw, {}, { schema }),
		]) {
			expect(validate).toThrow(ConfigError);
			expect(validate).toThrow("/content/component");
		}
	},
);

test.each(["./prepared", "/unknown/prepared", "", {}, null])(
	"rejects retired paths.prepared rather than ignoring it: %j",
	(prepared) => {
		const raw = { paths: { prepared } };
		for (const validate of [
			() => validateConfig(raw, {}),
			() => validateConfig(raw, {}, { schema }),
		]) {
			expect(validate).toThrow(ConfigError);
			expect(validate).toThrow("/paths/prepared");
		}
	},
);

test.each([
	{ content: { sources: {} } },
	{ paths: { sources: "./missing.svelte" } },
])("does not introduce source-setting aliases: %j", (raw) => {
	expect(() => validateConfig(raw, {})).toThrow(ConfigError);
});

test("only the supplied schema can authorize and validate an extension", () => {
	const raw = { pieces: { records: { ...piece, badge: "featured" } } };
	expect(() => validateConfig(raw)).toThrow();
	expect(validateConfig(raw, {}, { schema }).pieces.records.badge).toBe(
		"featured",
	);
	expect(() =>
		validateConfig(
			{ pieces: { records: { ...piece, badge: 1 } } },
			{},
			{ schema },
		),
	).toThrow();
});
