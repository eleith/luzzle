import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { describe, expect, test } from "vitest";
import { createInputSchema } from "./input-schema.js";
import { ConfigSchema } from "./schema.js";

const InputSchema = createInputSchema(ConfigSchema);

describe("configuration input schema", () => {
	test("allows sparse overrides without weakening the resolved contract", () => {
		const input = {
			paths: { database: "./custom.sqlite" },
			theme: { markdown: { code: { light: "min-light" } } },
		};
		expect(Value.Check(InputSchema, input)).toBe(true);
		expect(Value.Check(ConfigSchema, input)).toBe(false);
		expect(ConfigSchema.required).toContain("url");
		expect(InputSchema.required).toBeUndefined();
	});

	test("keeps required fields inside piece arrays", () => {
		expect(
			Value.Check(InputSchema, {
				pieces: [{ type: "books", fields: { title: "title" } }],
			}),
		).toBe(false);
		expect(
			Value.Check(InputSchema, {
				pieces: [
					{
						type: "books",
						fields: { title: "title", date_consumed: "date_read" },
					},
				],
			}),
		).toBe(true);
	});

	test("relaxes actual defaults inside array items and unions, not all fields", () => {
		const schema = Type.Object({
			entries: Type.Array(
				Type.Union([
					Type.Object({
						mode: Type.Literal("a"),
						value: Type.String({ default: "value" }),
					}),
					Type.Object({ mode: Type.Literal("b"), value: Type.String() }),
				]),
				{ default: [] },
			),
		});
		const relaxed = createInputSchema(schema);
		expect(Value.Check(relaxed, {})).toBe(true);
		expect(Value.Check(relaxed, { entries: [{ mode: "a" }] })).toBe(true);
		expect(Value.Check(relaxed, { entries: [{ mode: "b" }] })).toBe(false);
		expect(Value.Check(schema, { entries: [{ mode: "a" }] })).toBe(false);
	});

	test("does not invent authentication, credentials or AI defaults", () => {
		expect(Value.Check(InputSchema, {})).toBe(true);
		for (const raw of [
			{ auth: {} },
			{ auth: { credentials: { username: "admin", password: "password" } } },
			{ auth: { secret: "s", credentials: { username: "admin" } } },
			{ ai: {} },
			{ ai: { provider: "google" } },
			{ ai: { api_key: "key" } },
		])
			expect(Value.Check(InputSchema, raw)).toBe(false);
	});

	test("allows omitted OIDC display name but still requires its credentials", () => {
		const raw = {
			auth: {
				secret: "${SECRET}",
				oidc: {
					issuer: "${ISSUER}",
					clientId: "client",
					clientSecret: "${CLIENT_SECRET}",
				},
			},
		};
		expect(Value.Check(InputSchema, raw)).toBe(true);
		expect(Value.Check(InputSchema, { auth: { secret: "s", oidc: {} } })).toBe(
			false,
		);
	});

	test("treats false, zero, empty and null defaults as real defaults", () => {
		const schema = Type.Object({
			flag: Type.Boolean({ default: false }),
			count: Type.Number({ default: 0 }),
			text: Type.String({ default: "" }),
			nullable: Type.Union([Type.String(), Type.Null()], { default: null }),
		});
		expect(Value.Check(createInputSchema(schema), {})).toBe(true);
		expect(Value.Check(schema, {})).toBe(false);
	});

	test("does not traverse or alter example/default data as though it were schema", () => {
		const data = {
			type: "object",
			required: ["example"],
			properties: { example: { default: "value" } },
		};
		const schema = Type.Object({
			settings: Type.Unknown({ default: data, examples: [data] }),
		});
		const before = JSON.stringify(schema);
		const input = createInputSchema(schema);
		expect(input.properties.settings.default).toEqual(data);
		expect(input.properties.settings.examples).toEqual([data]);
		expect(JSON.stringify(schema)).toBe(before);
	});

	test("preserves optional fields and produces independently editable copies", () => {
		const schema = Type.Object({ value: Type.Optional(Type.String()) });
		const input = createInputSchema(schema);
		expect(Value.Check(input, {})).toBe(true);
		input.properties.value.description = "Input help";
		expect(schema.properties.value.description).toBeUndefined();
	});
});
