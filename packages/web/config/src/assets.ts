import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { Config } from "./lib/config/config.js";

export const MAX_CONFIGURED_ASSET_BYTES = 5 * 1024 * 1024;

/** Read a local file selected in configuration, never a request path. */
export async function readConfiguredAsset(
	config: Pick<Config, "paths">,
	configuredSource: string,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
	if (!path.isAbsolute(configuredSource) && !config.paths.config)
		return undefined;
	const filename = path.resolve(
		path.dirname(config.paths.config ?? ""),
		configuredSource,
	);
	try {
		const file = await stat(filename);
		if (
			!file.isFile() ||
			file.size === 0 ||
			file.size > MAX_CONFIGURED_ASSET_BYTES
		)
			return undefined;

		const bytes = await readFile(filename);
		if (bytes.length === 0 || bytes.length > MAX_CONFIGURED_ASSET_BYTES)
			return undefined;
		return new Uint8Array(bytes);
	} catch {
		return undefined;
	}
}
