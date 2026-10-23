import { readFileSync } from "fs";
import { parse as yamlParse, YAMLParseError } from "yaml";
import { Value } from "@sinclair/typebox/value";
import { ConfigSchema } from "./schema.js";
import type { Static, TSchema } from "@sinclair/typebox";
import type { Config } from "./schema.js";
import { createInputSchema } from "./input-schema.js";
import { ConfigError, configIssues } from "./errors.js";
import { interpolate } from "./interpolate.js";

// Compare validated values, not TypeBox's exact schema/required-tuple representation.
type BaseConfigSchema = TSchema & { static: Config };

export interface ConfigSchemaOptions<
	Schema extends BaseConfigSchema = BaseConfigSchema,
> {
	/** A complete schema extending the base configuration contract. */
	schema: Schema;
}

export type ConfigPublic = {
	url: Pick<Config["url"], "app" | "luzzle_assets" | "app_assets">;
	content: Config["content"];
};

export function validateConfig(raw: unknown, env?: NodeJS.ProcessEnv): Config;
export function validateConfig<Schema extends BaseConfigSchema>(
	raw: unknown,
	env: NodeJS.ProcessEnv | undefined,
	options: ConfigSchemaOptions<Schema>,
): Static<Schema>;
export function validateConfig(
	raw: unknown,
	env: NodeJS.ProcessEnv = process.env,
	options?: ConfigSchemaOptions,
): Config {
	const schema = options?.schema ?? ConfigSchema;
	const inputSchema = createInputSchema(schema);
	// Check input shape before defaults: Value.Default can otherwise turn an array
	// supplied for a defaulted object into an apparently valid configuration.
	if (!Value.Check(inputSchema, raw)) {
		throw new ConfigError(configIssues(Value.Errors(inputSchema, raw)));
	}

	const defaulted = Value.Default(schema, structuredClone(raw));
	const config = interpolate(defaulted, env);
	if (!Value.Check(schema, config)) {
		throw new ConfigError(configIssues(Value.Errors(schema, config)));
	}
	return config;
}

/** No filename uses defaults; an explicit filename must exist and be readable. */
function loadConfig(userConfigPath?: string): Config;
function loadConfig<Schema extends BaseConfigSchema>(
	userConfigPath: string | undefined,
	options: ConfigSchemaOptions<Schema>,
): Static<Schema>;
function loadConfig(
	userConfigPath?: string,
	options?: ConfigSchemaOptions,
): Config {
	let raw: unknown = {};
	if (userConfigPath !== undefined) {
		const source = readFileSync(userConfigPath, "utf8");
		try {
			raw = yamlParse(source) ?? {};
		} catch (error) {
			if (!(error instanceof YAMLParseError)) throw error;
			const { line, col: column } = error.linePos![0];
			throw new ConfigError([
				{
					path: "",
					message: `Invalid YAML syntax (${error.code}) at line ${line}, column ${column}.`,
					category: error.code,
					line,
					column,
				},
			]);
		}
	}

	const config = options
		? validateConfig(raw, process.env, options)
		: validateConfig(raw);
	if (userConfigPath !== undefined) {
		config.paths.config = userConfigPath;
		const schema = options?.schema ?? ConfigSchema;
		if (!Value.Check(schema, config)) {
			throw new ConfigError(configIssues(Value.Errors(schema, config)));
		}
	}
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
