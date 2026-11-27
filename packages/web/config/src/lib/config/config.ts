import { readFileSync } from "fs";
import { parse as yamlParse, YAMLParseError } from "yaml";
import { Type, TypeGuard } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { ConfigSchema } from "./schema.js";
import type { Static, TSchema } from "@sinclair/typebox";
import type { Config } from "./schema.js";
import { createInputSchema } from "./input-schema.js";
import { ConfigError, configIssues } from "./errors.js";
import { configuredAssetFilename, configuredAssetUrl } from "../../asset-urls.js";
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
	content: {
		text: Config["content"]["text"];
		/** Resolved public URLs; configured basenames are public, directories are not. */
		images: { favicon: string; opengraph: string };
	};
};

function applyConfigDefaults(schema: BaseConfigSchema, raw: unknown): unknown {
	const pieces = (raw as Record<string, unknown>).pieces;
	if (
		pieces !== undefined &&
		(pieces === null ||
			typeof pieces !== "object" ||
			(Object.getPrototypeOf(pieces) !== Object.prototype &&
				Object.getPrototypeOf(pieces) !== null))
	) {
		throw new ConfigError([
			{ path: "/pieces", message: "Expected a plain mapping" },
		]);
	}

	const input = structuredClone(raw) as Record<string, unknown>;
	const pieceMap = schema.properties?.pieces;
	if (!TypeGuard.IsRecord(pieceMap)) return Value.Default(schema, input);

	// TypeBox 0.34 clones/merges record defaults by assignment (losing __proto__)
	// and skips nested defaults when the entry schema has no default itself.
	// Let it default the rest of the config, then handle this record by own key.
	const defaulted = Value.Default(
		{ ...schema, properties: { ...schema.properties, pieces: Type.Any() } },
		input,
	) as Record<string, unknown>;
	const defaults =
		typeof pieceMap.default === "function"
			? pieceMap.default()
			: pieceMap.default;
	if (defaults !== undefined || defaulted.pieces !== undefined) {
		const entries = {
			...structuredClone(defaults),
			...(defaulted.pieces as Record<string, unknown>),
		};
		const [entrySchema] = Object.values(pieceMap.patternProperties);
		defaulted.pieces = Object.fromEntries(
			Object.entries(entries).map(([key, value]) => [
				key,
				Value.Default(entrySchema, value),
			]),
		);
	}
	return defaulted;
}

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

	const config = interpolate(applyConfigDefaults(schema, raw), env);
	if (!Value.Check(schema, config)) {
		throw new ConfigError(configIssues(Value.Errors(schema, config)));
	}
	const { sans, mono } = config.content.fonts;
	if (
		sans &&
		mono &&
		sans !== mono &&
		configuredAssetFilename(sans) === configuredAssetFilename(mono)
	) {
		throw new ConfigError([
			{
				path: "/content/fonts/mono",
				message: `Both font files would be served at ${configuredAssetUrl("fonts", mono)}. Use different filenames or select the same file for both roles.`,
			},
		]);
	}
	// Direct lookups of unconfigured piece names must not find inherited keys.
	Object.setPrototypeOf(config.pieces, null);
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
			raw = yamlParse(source, { stringKeys: true }) ?? {};
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
			if (acc && typeof acc === "object" && Object.hasOwn(acc, key)) {
				return acc[key] as Record<string, unknown>;
			}
			return undefined;
		},
		obj as unknown as undefined | Record<string, unknown>,
	);
}

function setOwnValue(
	obj: Record<string, unknown>,
	key: string,
	value: unknown,
): void {
	if (Object.hasOwn(obj, key)) {
		obj[key] = value;
	} else {
		Object.defineProperty(obj, key, {
			value,
			enumerable: true,
			writable: true,
			configurable: true,
		});
	}
}

function setConfigValue(obj: Config, path: string, value: unknown): void {
	const keys = path.split(".");
	const lastKey = keys.pop()!;
	let current: Record<string, unknown> = obj as unknown as Record<
		string,
		unknown
	>;

	for (const key of keys) {
		if (
			!Object.hasOwn(current, key) ||
			typeof current[key] !== "object" ||
			current[key] === null
		) {
			setOwnValue(current, key, {});
		}
		current = current[key] as Record<string, unknown>;
	}
	setOwnValue(current, lastKey, value);
}

export { loadConfig, getConfigValue, setConfigValue, type Config };
