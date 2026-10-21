import type { Config, ConfigPublic } from "./lib/config/config.js";
import {
	loadConfig,
	validateConfig,
	getConfigValue,
	setConfigValue,
} from "./lib/config/config.js";
export { resolvePreparedDirectory } from "./lib/config/paths.js";
export { ConfigError } from "./lib/config/errors.js";
export type { ConfigIssue } from "./lib/config/errors.js";

export {
	type Config,
	type ConfigPublic,
	loadConfig,
	validateConfig,
	getConfigValue,
	setConfigValue,
};
