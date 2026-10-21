import path from "node:path";
import type { Config } from "./config.js";

export function resolvePreparedDirectory(config: Config): string {
	if (!config.paths.config) {
		throw new Error(
			"config.paths.config is missing; cannot resolve prepared directory",
		);
	}
	return path.resolve(path.dirname(config.paths.config), config.paths.prepared);
}
