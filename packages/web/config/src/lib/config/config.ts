import { readFileSync, existsSync } from "fs";
import { parse as yamlParse } from "yaml";
import { Value } from "@sinclair/typebox/value";
import { ConfigSchema } from "./schema.js";
import type { Config } from "./schema.js";
import { createInputSchema } from "./input-schema.js";
import { ConfigError, configIssues } from "./errors.js";
import { interpolate } from "./interpolate.js";

const InputSchema = createInputSchema(ConfigSchema);

export type ConfigPublic = {
	url: Pick<Config["url"], "app" | "luzzle_assets" | "app_assets">;
	content: Config["content"];
};

export function validateConfig(
	raw: unknown,
	env: NodeJS.ProcessEnv = process.env,
): Config {
	// Check input shape before defaults: Value.Default can otherwise turn an array
	// supplied for a defaulted object into an apparently valid configuration.
	if (!Value.Check(InputSchema, raw)) {
		throw new ConfigError(configIssues(Value.Errors(InputSchema, raw)));
	}

	const defaulted = Value.Default(ConfigSchema, structuredClone(raw));
	const config = interpolate(defaulted, env);
	if (!Value.Check(ConfigSchema, config)) {
		throw new ConfigError(configIssues(Value.Errors(ConfigSchema, config)));
	}
	return config;
}

function loadConfig(userConfigPath?: string): Config {
	let raw: unknown = {};
	if (userConfigPath && existsSync(userConfigPath)) {
		raw = yamlParse(readFileSync(userConfigPath, "utf8")) ?? {};
	}

	const config = validateConfig(raw);
	if (userConfigPath) config.paths.config = userConfigPath;
	return config;
}

function getConfigValue(obj: Config, path: string): unknown {
	return path.split(".").reduce(
		(acc, key) => {
			if (acc && typeof acc === "object" && key in acc) {
				return acc[key] as Record<string, unknown>;
			}
			return undefined;
		},
		obj as unknown as undefined | Record<string, unknown>,
	);
}

function setConfigValue(obj: Config, path: string, value: unknown): void {
	const keys = path.split(".");
	const lastKey = keys.pop()!;
	let current: Record<string, unknown> = obj as unknown as Record<
		string,
		unknown
	>;

	for (const key of keys) {
		if (typeof current[key] !== "object" || current[key] === null) {
			current[key] = {};
		}
		current = current[key] as Record<string, unknown>;
	}
	current[lastKey] = value;
}

export { loadConfig, getConfigValue, setConfigValue, type Config };
