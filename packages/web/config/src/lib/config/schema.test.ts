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

test("only the supplied schema can authorize and validate an extension", () => {
	const raw = { pieces: [{ ...piece, badge: "featured" }] };
	expect(() => validateConfig(raw)).toThrow();
	expect(validateConfig(raw, {}, { schema }).pieces[0].badge).toBe("featured");
	expect(() =>
		validateConfig({ pieces: [{ ...piece, badge: 1 }] }, {}, { schema }),
	).toThrow();
});
