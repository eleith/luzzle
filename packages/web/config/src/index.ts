import type { Config, ConfigPublic } from "./lib/config/config.js";
import {
	loadConfig,
	validateConfig,
	getConfigValue,
	setConfigValue,
} from "./lib/config/config.js";
export { resolvePreparedDirectory } from "./lib/config/paths.js";
export { ConfigError } from "./lib/config/errors.js";
export { ConfigSchema } from "./lib/config/schema.js";
export { createInputSchema } from "./lib/config/input-schema.js";
export { createFieldMappingSchema } from "./lib/mapping/schema.js";
export type { ConfigSchemaOptions } from "./lib/config/config.js";
export type { FieldMapping, FieldMappings } from "./lib/mapping/schema.js";
export type { ConfigIssue } from "./lib/config/errors.js";

export {
	type Config,
	type ConfigPublic,
	loadConfig,
	validateConfig,
	getConfigValue,
	setConfigValue,
};
