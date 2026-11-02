import { TypeGuard } from "@sinclair/typebox";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/** User input may omit defaults and use environment references in patterned strings. */
export function createInputSchema(schema: TSchema): TSchema {
	const input = Value.Clone(schema);

	function relax(node: TSchema): void {
		if (TypeGuard.IsObject(node)) {
			node.required = node.required?.filter(
				(key) => !("default" in node.properties[key]),
			);
			if (!node.required?.length) delete node.required;
			Object.values(node.properties).forEach(relax);
		} else if (TypeGuard.IsArray(node)) {
			relax(node.items);
		} else if (TypeGuard.IsUnion(node)) {
			node.anyOf.forEach(relax);
		} else if (TypeGuard.IsString(node) && node.pattern !== undefined) {
			// Interpolation happens after input validation. Only the input pattern
			// admits references; the original pattern checks the expanded value.
			node.pattern = `(?:${node.pattern})|\\$\\{[^}:]+(?::-[^}]*)?\\}`;
		}
	}

	relax(input);
	return input;
}
