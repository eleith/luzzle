import { TypeGuard } from "@sinclair/typebox";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/** User input may omit defaulted fields; resolved configuration may not. */
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
		}
	}

	relax(input);
	return input;
}
