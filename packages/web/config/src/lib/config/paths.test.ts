import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadConfig, validateConfig } from "./config.js";
import { resolvePreparedDirectory } from "./paths.js";

describe("resolvePreparedDirectory", () => {
	let directory: string;
	let filename: string;

	beforeEach(() => {
		directory = mkdtempSync(path.join(tmpdir(), "luzzle-prepared-paths-"));
		filename = path.join(directory, "config.yaml");
		writeFileSync(filename, "");
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
		rmSync(directory, { recursive: true, force: true });
	});

	test.each(["relative", "absolute"])(
		"resolves defaults from a %s config filename",
		(kind) => {
			const supplied =
				kind === "relative" ? path.relative(process.cwd(), filename) : filename;
			const config = loadConfig(supplied);
			expect(config.paths.config).toBe(supplied);
			expect(config.paths.prepared).toBe("./data/prepared");
			expect(resolvePreparedDirectory(config)).toBe(
				path.join(directory, "data/prepared"),
			);
		},
	);

	test("resolves a custom relative path from the config directory", () => {
		writeFileSync(filename, "paths:\n  prepared: ../template-revisions\n");
		const config = loadConfig(filename);
		expect(resolvePreparedDirectory(config)).toBe(
			path.resolve(directory, "../template-revisions"),
		);
		expect(config.paths.prepared).toBe("../template-revisions");
	});

	test("preserves an absolute prepared directory", () => {
		const prepared = path.join(directory, "revisions");
		writeFileSync(
			filename,
			`paths:\n  prepared: ${JSON.stringify(prepared)}\n`,
		);
		expect(resolvePreparedDirectory(loadConfig(filename))).toBe(prepared);
	});

	test("resolves an explicit environment reference", () => {
		vi.stubEnv("CONFIG_TEST_PREPARED", "./custom/revisions");
		writeFileSync(filename, "paths:\n  prepared: '${CONFIG_TEST_PREPARED}'\n");
		const config = loadConfig(filename);
		expect(config.paths.prepared).toBe("./custom/revisions");
		expect(resolvePreparedDirectory(config)).toBe(
			path.join(directory, "custom/revisions"),
		);
	});

	test("does not infer a prepared directory from the environment", () => {
		vi.stubEnv("LUZZLE_PREPARED", "./not-configured");
		expect(loadConfig(filename).paths.prepared).toBe("./data/prepared");
	});

	test("absolute config metadata makes resolution independent of cwd", () => {
		const config = loadConfig(filename);
		const expected = path.join(directory, "data/prepared");
		vi.spyOn(process, "cwd").mockReturnValue(path.join(directory, "elsewhere"));
		expect(resolvePreparedDirectory(config)).toBe(expected);
	});

	test("relative config metadata resolves against cwd", () => {
		const config = validateConfig(
			{ paths: { config: "site/config.yaml" } },
			{},
		);
		vi.spyOn(process, "cwd").mockReturnValue(directory);
		expect(resolvePreparedDirectory(config)).toBe(
			path.join(directory, "site/data/prepared"),
		);
	});

	test("rejects missing config metadata instead of falling back to cwd", () => {
		const config = validateConfig({}, {});
		expect(() => resolvePreparedDirectory(config)).toThrow(
			"config.paths.config is missing; cannot resolve prepared directory",
		);
	});

	test("rejects empty config metadata even for an absolute prepared directory", () => {
		const config = validateConfig(
			{ paths: { config: "", prepared: directory } },
			{},
		);
		expect(() => resolvePreparedDirectory(config)).toThrow(
			"config.paths.config is missing; cannot resolve prepared directory",
		);
	});
});
