import { expect, test } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { createFieldMappingSchema } from "./schema.js";

const schema = createFieldMappingSchema("FixtureField");

test.each([
	"cover",
	{ field: "length", default: 0 },
	{ value: "A literal label" },
	{ value: false },
	{ fields: { name: "creator.name" } },
	{ each: "facts", fields: { label: "name", value: "text" } },
	{ fields: { group: { each: "items", fields: { value: "$" } } } },
])("accepts a bounded metadata binding: %j", (binding) => {
	expect(Value.Check(schema, binding)).toBe(true);
});

test.each([
	{},
	"",
	{ expression: "metadata.cover" },
	{ field: "cover", value: "ambiguous" },
	{ each: "items" },
])("rejects an unsupported binding: %j", (binding) => {
	expect(Value.Check(schema, binding)).toBe(false);
});
