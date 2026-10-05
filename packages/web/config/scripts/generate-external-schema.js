import { readFileSync, writeFileSync } from "node:fs";
import { ConfigSchema } from "../src/lib/config/schema.ts";
import { createInputSchema } from "../src/lib/config/input-schema.ts";

const output = new URL(
	"../src/lib/config/web.config.schema.json",
	import.meta.url,
);
const schema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	...createInputSchema(ConfigSchema),
};
const content = JSON.stringify(schema, null, 2) + "\n";

if (process.argv.includes("--check")) {
	if (readFileSync(output, "utf8") !== content) {
		throw new Error(
			"Editor schema is stale. Run pnpm --filter @luzzle/web.config build:external-schema.",
		);
	}
} else {
	writeFileSync(output, content);
}
