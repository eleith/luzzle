import { ConfigError } from "./errors.js";

const ENV_REFERENCE = /\$\$|\$\{([^}:]+)(?::-([^}]*))?\}/g;

export function interpolate(
	value: unknown,
	env: NodeJS.ProcessEnv = process.env,
): unknown {
	const missing = new Map<string, Set<string>>();

	function visit(node: unknown, path: string): unknown {
		if (typeof node === "string") {
			return node.replace(
				ENV_REFERENCE,
				(match, name: string, fallback: string | undefined) => {
					if (match === "$$") return "$";

					const replacement = Object.hasOwn(env, name) ? env[name] : undefined;
					if (replacement !== undefined) return replacement;
					if (fallback !== undefined) return fallback;

					const paths = missing.get(name) ?? new Set<string>();
					paths.add(path);
					missing.set(name, paths);
					return match;
				},
			);
		}

		if (Array.isArray(node)) {
			return node.map((item, index) => visit(item, `${path}/${index}`));
		}

		if (node !== null && typeof node === "object") {
			return Object.fromEntries(
				Object.entries(node).map(([key, item]) => {
					const segment = key.replace(/~/g, "~0").replace(/\//g, "~1");
					return [key, visit(item, `${path}/${segment}`)];
				}),
			);
		}

		return node;
	}

	const result = visit(value, "");
	if (missing.size > 0) {
		throw new ConfigError(
			[...missing]
				.sort(([left], [right]) => left.localeCompare(right))
				.flatMap(([name, paths]) =>
					[...paths].sort().map((path) => ({
						path,
						message: `Environment variable "${name}" is missing.`,
					})),
				),
		);
	}

	return result;
}
