import { expect, test } from "vitest";
import { Type } from "@sinclair/typebox";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ConfigError } from "./errors.js";
import { ConfigSchema } from "./schema.js";
import { loadConfig, validateConfig } from "./config.js";

const schema = Type.Object(
	{
		...ConfigSchema.properties,
		instance: Type.String({ default: "demo" }),
		pieces: Type.Array(
			Type.Object(
				{
					...ConfigSchema.properties.pieces.items.properties,
					badge: Type.String({ default: "new" }),
				},
				{ additionalProperties: false },
			),
			{ default: [] },
		),
	},
	{ additionalProperties: false },
);

const piece = {
	type: "records",
	fields: { title: "name", date_consumed: "date" },
};

test("consumers can supply complete extended schemas with their own defaults", () => {
	const config = validateConfig({ pieces: [piece] }, {}, { schema });
	expect(config.pieces[0].badge).toBe("new");
});

test("loading defaults preserves the supplied schema and base config contract", () => {
	const config = loadConfig(undefined, { schema });
	expect(config.instance).toBe("demo");
	expect(config.paths).toBeDefined();
	expect(config.pieces).toEqual([]);
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
			pieces: [{ ...piece, components: { icon: "owned.svelte" } }],
		}),
	).toThrow(ConfigError);
});

test("site identity text remains configurable without source settings", () => {
	const content = {
		text: { title: "My garden", description: "Notes and records" },
	};
	expect(validateConfig({ content }, {}).content).toEqual(content);
	expect(validateConfig({}, {}).content).toEqual({
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
	const raw = { pieces: [{ ...piece, badge: "featured" }] };
	expect(() => validateConfig(raw)).toThrow();
	expect(validateConfig(raw, {}, { schema }).pieces[0].badge).toBe("featured");
	expect(() =>
		validateConfig({ pieces: [{ ...piece, badge: 1 }] }, {}, { schema }),
	).toThrow();
});
