import { afterEach, beforeEach, expect, test } from "vitest";
import {
	mkdir,
	mkdtemp,
	rm,
	symlink,
	truncate,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import { MAX_CONFIGURED_ASSET_BYTES, readConfiguredAsset } from "./assets.js";
import { loadConfig, validateConfig } from "./index.js";
import type { Config } from "./index.js";

let directory: string;
beforeEach(async () => {
	const cache = path.resolve("node_modules/.cache");
	await mkdir(cache, { recursive: true });
	directory = await mkdtemp(path.join(cache, "configured-assets-"));
});
afterEach(async () => {
	await rm(directory, { recursive: true, force: true });
});

function configuration(
	filename: string | undefined = path.join(directory, "config.yaml"),
): Pick<Config, "paths"> {
	const config = validateConfig({}, {});
	config.paths.config = filename;
	return { paths: config.paths };
}

test("reads the configured file's bytes", async () => {
	const bytes = new Uint8Array([0, 255, 1, 128]);
	await writeFile(path.join(directory, "font.woff2"), bytes);
	expect(await readConfiguredAsset(configuration(), "./font.woff2")).toEqual(
		bytes,
	);
});

test.each([false, true])(
	"resolves against supplied config alias (relative filename: %s), not realpath",
	async (relative) => {
		await mkdir(path.join(directory, "config"));
		await mkdir(path.join(directory, "content"));
		await mkdir(path.join(directory, "config/content"));
		await writeFile(
			path.join(directory, "config/config.yaml"),
			"content:\n  fonts:\n    sans: ./content/font.woff2\n",
		);
		await symlink("config/config.yaml", path.join(directory, "config.yaml"));
		await writeFile(path.join(directory, "content/font.woff2"), "correct");
		await writeFile(path.join(directory, "config/content/font.woff2"), "wrong");
		const filename = path.join(directory, "config.yaml");
		const config = loadConfig(
			relative ? path.relative(process.cwd(), filename) : filename,
		);
		expect(
			Buffer.from(
				(await readConfiguredAsset(config, config.content.fonts.sans!))!,
			).toString(),
		).toBe("correct");
	},
);

test("accepts an absolute source with or without a supplied config filename", async () => {
	const filename = path.join(directory, "image.png");
	await writeFile(filename, "absolute");
	for (const config of [
		configuration(),
		{ paths: validateConfig({}, {}).paths },
	]) {
		expect(await readConfiguredAsset(config, filename)).toEqual(
			new TextEncoder().encode("absolute"),
		);
	}
});

test("relative sources require config metadata even when they exist under the working directory", async () => {
	const filename = path.join(directory, "image.png");
	await writeFile(filename, "relative");
	const config = { paths: validateConfig({}, {}).paths };
	expect(
		await readConfiguredAsset(config, path.relative(process.cwd(), filename)),
	).toBeUndefined();
});

test("follows selected file symlinks to regular files", async () => {
	await writeFile(path.join(directory, "target.woff2"), "selected");
	await symlink("target.woff2", path.join(directory, "font.woff2"));
	expect(await readConfiguredAsset(configuration(), "font.woff2")).toEqual(
		new TextEncoder().encode("selected"),
	);
});

test.each(["missing", "empty", "directory", "oversize"])(
	"returns undefined for %s sources without leaking errors",
	async (source) => {
		await writeFile(path.join(directory, "empty"), "");
		await mkdir(path.join(directory, "directory"));
		await writeFile(path.join(directory, "oversize"), "");
		await truncate(
			path.join(directory, "oversize"),
			MAX_CONFIGURED_ASSET_BYTES + 1,
		);
		await expect(
			readConfiguredAsset(configuration(), source),
		).resolves.toBeUndefined();
	},
);

test("accepts exactly the limit", async () => {
	const bytes = Buffer.alloc(MAX_CONFIGURED_ASSET_BYTES, 42);
	await writeFile(path.join(directory, "limit"), bytes);
	const result = await readConfiguredAsset(configuration(), "limit");
	expect(result?.byteLength).toBe(MAX_CONFIGURED_ASSET_BYTES);
	expect(Buffer.from(result!).equals(bytes)).toBe(true);
});

test("rereads configured files when they change", async () => {
	const config = configuration();
	const filename = path.join(directory, "selected");
	expect(await readConfiguredAsset(config, "selected")).toBeUndefined();
	await writeFile(filename, "first");
	expect(await readConfiguredAsset(config, "selected")).toEqual(
		new TextEncoder().encode("first"),
	);
	await writeFile(filename, "other");
	expect(await readConfiguredAsset(config, "selected")).toEqual(
		new TextEncoder().encode("other"),
	);
	await rm(filename);
	expect(await readConfiguredAsset(config, "selected")).toBeUndefined();
});
