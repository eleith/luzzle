import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

/** Binding grammar, not resolved values. Stable IDs distinguish each field's recursive $refs. */
export function createFieldMappingSchema(id: string, description?: string) {
	return Type.Recursive(
		(Self) =>
			Type.Union([
				Type.String({ minLength: 1 }),
				Type.Object(
					{
						field: Type.String({ minLength: 1 }),
						default: Type.Optional(Type.Unknown()),
					},
					{ additionalProperties: false },
				),
				Type.Object({ value: Type.Unknown() }, { additionalProperties: false }),
				Type.Object(
					{ fields: Type.Record(Type.String(), Self) },
					{ additionalProperties: false },
				),
				Type.Object(
					{
						each: Type.String({ minLength: 1 }),
						fields: Type.Record(Type.String(), Self),
					},
					{ additionalProperties: false },
				),
			]),
		{ $id: id, description },
	);
}

export type FieldMapping = Static<ReturnType<typeof createFieldMappingSchema>>;
export type FieldMappings = Record<string, FieldMapping>;
