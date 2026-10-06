import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Config } from "./config.js";
import {
	loadConfig,
	validateConfig,
	getConfigValue,
	setConfigValue,
} from "./config.js";
import { ConfigError } from "./errors.js";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

interface TestConfig extends Config {
	a: { b: { c: string } };
}

function validationError(
	raw: unknown,
	env: NodeJS.ProcessEnv = {},
): ConfigError {
	try {
		validateConfig(raw, env);
	} catch (error) {
		if (error instanceof ConfigError) return error;
		throw error;
	}
	throw new Error("Expected configuration validation to fail");
}

describe("loadConfig", () => {
	let directory: string;
	let filename: string;

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), "luzzle-config-"));
		filename = join(directory, "config.yaml");
		vi.stubEnv("LUZZLE_APP_URL", undefined);
		vi.stubEnv("LUZZLE_ASSET_SALT", undefined);
	});

	afterEach(() => {
		rmSync(directory, { recursive: true, force: true });
		vi.unstubAllEnvs();
	});

	test("loads defaults without a filename", () => {
		const config = loadConfig();
		expect(config.url.app).toBe("http://localhost:8080");
		expect(config.paths.config).toBeUndefined();
		expect(config.auth).toBeUndefined();
	});

	test("loads a user config fixture", () => {
		const config = loadConfig(`${import.meta.dirname}/user.config.yaml`);
		expect(config.url.app).toBe("https://example.com");
		expect(config.storage.root).toBe("./archive");
	});

	test("loads defaults for a missing file and records its path", () => {
		const config = loadConfig(filename);
		expect(config.url.app).toBe("http://localhost:8080");
		expect(config.paths.config).toBe(filename);
	});

	test.each(["", "# comments only\n", "null\n", "~\n"])(
		"loads defaults for empty/null YAML %j",
		(yaml) => {
			writeFileSync(filename, yaml);
			const config = loadConfig(filename);
			expect(config.url.app).toBe("http://localhost:8080");
			expect(config.paths.config).toBe(filename);
		},
	);

	test.each(["false", "0", "42", "a scalar", '""', "[]", "- url: {}"])(
		"rejects non-object YAML %j",
		(yaml) => {
			writeFileSync(filename, yaml);
			expect(() => loadConfig(filename)).toThrow(ConfigError);
		},
	);

	test.each([
		["url: [", "BAD_INDENT", 1, 7],
		["url:\n  app: one\n  app: two\n", "DUPLICATE_KEY", 3, 3],
		['url:\n  app: "synthetic-value\\q"\n', "BAD_DQ_ESCAPE", 2, 24],
	])(
		"reports YAML syntax diagnostics for %j",
		(yaml, category, line, column) => {
			writeFileSync(filename, yaml);
			let error: unknown;
			try {
				loadConfig(filename);
			} catch (caught) {
				error = caught;
			}
			expect(error).toBeInstanceOf(ConfigError);
			if (!(error instanceof ConfigError)) throw error;
			expect(error.issues).toEqual([
				{
					path: "",
					message: `Invalid YAML syntax (${category}) at line ${line}, column ${column}.`,
					category,
					line,
					column,
				},
			]);
			expect(error.message).toContain(error.issues[0].message);
			expect(error.message).not.toContain(yaml);
			expect(error.message).not.toContain("synthetic-value");
			expect(JSON.stringify(error)).not.toContain("synthetic-value");
			expect(error).not.toHaveProperty("cause");
		},
	);

	test("does not relabel non-syntax YAML conversion failures", () => {
		writeFileSync(filename, "storage:\n  root: *missing\n");
		expect(() => loadConfig(filename)).toThrow(ReferenceError);
	});

	test("rejects unknown properties in a user config fixture", () => {
		expect(() =>
			loadConfig(`${import.meta.dirname}/user-error.config.yaml`),
		).toThrow(ConfigError);
	});

	test("loads nested overrides, provider defaults and multiple pieces from YAML", () => {
		writeFileSync(
			filename,
			`
url:
  app: 'https://example.com'
auth:
  secret: 'short-secret'
  oidc:
    issuer: 'https://auth.example.com'
    clientId: 'client'
    clientSecret: 'client-secret'
sync:
  config: '/custom/rclone.conf'
  archive:
    remote: 'archive-remote'
    path: '/archive/path'
  cdn:
    remote: 'cdn-remote'
    path: '/cdn/path'
worker:
  queue:
    path: '/custom/sidequest.db'
pieces:
  - type: book
    fields:
      title: title
      date_consumed: date_read
  - type: video
    fields:
      title: title
      date_consumed: date_watched
      media: [image]
`,
		);
		const config = loadConfig(filename);
		expect(config.url.app).toBe("https://example.com");
		expect(config.auth).toEqual({
			secret: "short-secret",
			oidc: {
				name: "Single Sign-On",
				issuer: "https://auth.example.com",
				clientId: "client",
				clientSecret: "client-secret",
			},
		});
		expect(config.sync).toEqual({
			config: "/custom/rclone.conf",
			archive: { remote: "archive-remote", path: "/archive/path", flags: [] },
			cdn: {
				remote: "cdn-remote",
				path: "/cdn/path",
				flags: [],
				strategy: "sync",
			},
		});
		expect(config.worker.queue.path).toBe("/custom/sidequest.db");
		expect(config.pieces).toHaveLength(2);
		expect(config.pieces[0].type).toBe("book");
		expect(config.pieces[1].fields.media).toEqual(["image"]);
		expect(config.paths.config).toBe(filename);
	});

	test("interpolates parsed YAML using process.env, including secrets and array entries", () => {
		vi.stubEnv("CONFIG_TEST_SECRET", "test-secret");
		vi.stubEnv("CONFIG_TEST_TITLE", "title: # remains a string");
		vi.stubEnv("CONFIG_TEST_MEDIA", "cover");
		vi.stubEnv("CONFIG_TEST_AI_KEY", "google-key");
		// The public validator, like the filesystem loader, defaults to process.env.
		expect(
			validateConfig({
				ai: { provider: "google", api_key: "${CONFIG_TEST_AI_KEY}" },
			}).ai?.api_key,
		).toBe("google-key");
		writeFileSync(
			filename,
			`
auth:
  secret: '\${CONFIG_TEST_SECRET}'
  credentials:
    username: admin
    password: password
ai:
  provider: google
  api_key: '\${CONFIG_TEST_AI_KEY}'
pieces:
  - type: book
    fields:
      title: '\${CONFIG_TEST_TITLE}'
      date_consumed: date_read
      media: ['\${CONFIG_TEST_MEDIA}']
`,
		);
		const config = loadConfig(filename);
		expect(config.auth?.secret).toBe("test-secret");
		expect(config.ai?.api_key).toBe("google-key");
		expect(config.pieces[0].fields.title).toBe("title: # remains a string");
		expect(config.pieces[0].fields.media).toEqual(["cover"]);
	});

	test("reports unresolved references from files with their field paths", () => {
		vi.stubEnv("CONFIG_TEST_MISSING", undefined);
		writeFileSync(filename, "storage:\n  root: '${CONFIG_TEST_MISSING}'\n");
		expect(() => loadConfig(filename)).toThrow(
			'/storage/root: Environment variable "CONFIG_TEST_MISSING" is missing.',
		);
	});
});

describe("validateConfig", () => {
	const credentials = { username: "admin", password: "password" };
	const oidc = {
		issuer: "https://auth.example.com",
		clientId: "client",
		clientSecret: "secret",
	};

	test("resolves defaults while leaving optional services absent", () => {
		const config = validateConfig({}, {});
		expect(config.auth).toBeUndefined();
		expect(config.ai).toBeUndefined();
		expect(config.url).toEqual({
			app: "http://localhost:8080",
			app_assets: "",
			luzzle_assets: "",
		});
		expect(config.network).toEqual({
			internal: {
				explorer: "http://luzzle-web:3000",
				lsp: "http://luzzle-lsp:9001",
				worker: "http://luzzle-worker:9000",
			},
			public: { host: "0.0.0.0" },
		});
		expect(config.content.text).toEqual({
			title: "Luzzle Explorer",
			description: "A Luzzle Explorer instance",
		});
		expect(config.storage.root).toBe("./archive");
		expect(config.paths).toEqual({
			database: "./data/luzzle.sqlite",
			assets: "./assets/pieces",
			cache: "./nginx",
			static: "./static",
		});
		expect(config.assets.salt).toBe("");
		expect(config.sync).toEqual({
			config: "/app/rclone/rclone.conf",
			archive: { remote: "", path: "", flags: [] },
			cdn: { remote: "", path: "", flags: [], strategy: "sync" },
		});
		expect(config.worker.queue.path).toBe("./data/sidequest.sqlite");
		expect(config.pieces).toEqual([]);
		expect(config.theme.light["color-primary"]).toBe("#0d6efd");
		expect(config.theme.dark["color-primary"]).toBe("#3b82f6");
		expect(config.theme.globals["font-size-root"]).toBe(22);
		expect(config.theme.markdown.code).toEqual({
			light: "github-light",
			dark: "github-dark",
		});
	});

	test("defaults partial nested sections without replacing explicit empty strings or zero", () => {
		const config = validateConfig(
			{
				url: { app: "" },
				network: { public: { hmr_port: 0 } },
				sync: {
					archive: { remote: "backup" },
					cdn: { strategy: "copy", flags: ["--fast-list"] },
				},
				theme: {
					light: { "color-primary": "rebeccapurple" },
					globals: { "font-size-root": 0 },
				},
			},
			{},
		);
		expect(config.url.app).toBe("");
		expect(config.network.public).toEqual({ host: "0.0.0.0", hmr_port: 0 });
		expect(config.sync.archive).toEqual({
			remote: "backup",
			path: "",
			flags: [],
		});
		expect(config.sync.cdn).toEqual({
			remote: "",
			path: "",
			flags: ["--fast-list"],
			strategy: "copy",
		});
		expect(config.theme.light["color-primary"]).toBe("rebeccapurple");
		expect(config.theme.light["color-on-primary"]).toBe("#ffffff");
		expect(config.theme.globals["font-size-root"]).toBe(0);
		expect(config.theme.markdown.code.dark).toBe("github-dark");
	});

	test("does not mutate input, environment, or share mutable defaults between calls", () => {
		const raw = {
			auth: { secret: "${SECRET}", oidc: { ...oidc } },
			sync: { archive: { flags: ["${FLAG}"] } },
			theme: { light: { "color-primary": "red" } },
		};
		const original = structuredClone(raw);
		const env = { SECRET: "resolved-secret", FLAG: "--fast-list" };
		const config = validateConfig(raw, env);
		expect(raw).toEqual(original);
		expect(env).toEqual({ SECRET: "resolved-secret", FLAG: "--fast-list" });
		config.sync.archive.flags.push("--verbose");
		config.theme.light["color-primary"] = "blue";
		config.theme.dark["color-primary"] = "green";
		config.pieces.push({
			type: "book",
			fields: { title: "title", date_consumed: "date" },
		});
		expect(raw).toEqual(original);
		const next = validateConfig(raw, env);
		expect(next.sync.archive.flags).toEqual(["--fast-list"]);
		expect(next.theme.light["color-primary"]).toBe("red");
		expect(next.theme.dark["color-primary"]).toBe("#3b82f6");
		expect(next.pieces).toEqual([]);
	});

	test("does not mutate input when resolved validation fails", () => {
		const raw = {
			auth: { secret: "${SECRET}", credentials: { ...credentials } },
		};
		const original = structuredClone(raw);
		expect(() => validateConfig(raw, { SECRET: "" })).toThrow(ConfigError);
		expect(raw).toEqual(original);
	});

	test("accepts credentials with a nonempty secret shorter than 32 characters", () => {
		expect(
			validateConfig({ auth: { secret: "s", credentials } }, {}).auth,
		).toEqual({ secret: "s", credentials });
	});

	test("defaults only the OIDC display name and accepts a custom name", () => {
		expect(validateConfig({ auth: { secret: "s", oidc } }, {}).auth).toEqual({
			secret: "s",
			oidc: { ...oidc, name: "Single Sign-On" },
		});
		expect(
			validateConfig(
				{ auth: { secret: "s", oidc: { ...oidc, name: "Okta SSO" } } },
				{},
			).auth,
		).toEqual({
			secret: "s",
			oidc: { ...oidc, name: "Okta SSO" },
		});
	});

	test.each([
		["empty block", {}],
		["missing provider", { secret: "s" }],
		["missing secret", { credentials }],
		["empty secret", { secret: "", credentials }],
		["missing username", { secret: "s", credentials: { password: "p" } }],
		[
			"empty username",
			{ secret: "s", credentials: { username: "", password: "p" } },
		],
		["missing password", { secret: "s", credentials: { username: "u" } }],
		[
			"empty password",
			{ secret: "s", credentials: { username: "u", password: "" } },
		],
		[
			"missing issuer",
			{ secret: "s", oidc: { clientId: "c", clientSecret: "s" } },
		],
		[
			"missing clientId",
			{ secret: "s", oidc: { issuer: "i", clientSecret: "s" } },
		],
		[
			"missing clientSecret",
			{ secret: "s", oidc: { issuer: "i", clientId: "c" } },
		],
		["empty issuer", { secret: "s", oidc: { ...oidc, issuer: "" } }],
		["empty clientId", { secret: "s", oidc: { ...oidc, clientId: "" } }],
		[
			"empty clientSecret",
			{ secret: "s", oidc: { ...oidc, clientSecret: "" } },
		],
		["both providers", { secret: "s", credentials, oidc }],
		["null inactive OIDC", { secret: "s", credentials, oidc: null }],
		["null inactive credentials", { secret: "s", oidc, credentials: null }],
		["legacy enabled", { secret: "s", credentials, enabled: false }],
		["legacy type", { secret: "s", oidc, type: "oidc" }],
		["null auth", null],
	])("rejects auth with %s", (_label, auth) => {
		expect(() => validateConfig({ auth }, {})).toThrow(ConfigError);
	});

	test("never infers auth or AI credentials from environment variables", () => {
		const env = {
			LUZZLE_AUTH_SECRET: "secret",
			LUZZLE_AUTH_PASSWORD: "password",
			GOOGLE_API_KEY: "key",
			OIDC_ISSUER: oidc.issuer,
			OIDC_CLIENT_SECRET: oidc.clientSecret,
		};
		const config = validateConfig({}, env);
		expect(config.auth).toBeUndefined();
		expect(config.ai).toBeUndefined();
		expect(() => validateConfig({ auth: { credentials } }, env)).toThrow(
			ConfigError,
		);
		expect(() =>
			validateConfig({ auth: { secret: "s", oidc: {} } }, env),
		).toThrow(ConfigError);
		expect(() => validateConfig({ ai: { provider: "google" } }, env)).toThrow(
			ConfigError,
		);
	});

	test("accepts explicit AI provider and key", () => {
		expect(
			validateConfig({ ai: { provider: "google", api_key: "key" } }, {}).ai,
		).toEqual({
			provider: "google",
			api_key: "key",
		});
	});

	test.each([
		{},
		{ provider: "google" },
		{ api_key: "key" },
		{ provider: "google", api_key: "" },
		{ provider: "other", api_key: "key" },
		null,
	])("rejects incomplete or invalid AI %j", (ai) => {
		expect(() => validateConfig({ ai }, {})).toThrow(ConfigError);
	});

	test.each([
		["root array", []],
		["root scalar", "config"],
		["root false", false],
		["root null", null],
		["url array", { url: [] }],
		["storage array", { storage: [] }],
		["nested sync array", { sync: { archive: [] } }],
		["nested theme array", { theme: { light: [] } }],
		["provider array", { auth: { secret: "s", credentials: [] } }],
		["piece fields array", { pieces: [{ type: "book", fields: [] }] }],
	])(
		"rejects %s before defaulting can turn it into an object",
		(_label, raw) => {
			expect(() => validateConfig(raw, {})).toThrow(ConfigError);
		},
	);

	test.each([
		["unknown root property", { typo: true }],
		["unknown nested property", { storage: { rot: "./archive" } }],
		["empty storage root", { storage: { root: "" } }],
		["null defaulted section", { storage: null }],
		["null defaulted value", { url: { app: null } }],
		[
			"invalid theme enum",
			{ theme: { markdown: { code: { light: "not-a-theme" } } } },
		],
		[
			"missing piece type",
			{ pieces: [{ fields: { title: "title", date_consumed: "date" } }] },
		],
		[
			"missing piece title",
			{ pieces: [{ type: "book", fields: { date_consumed: "date" } }] },
		],
		[
			"missing piece date",
			{ pieces: [{ type: "book", fields: { title: "title" } }] },
		],
		["invalid array item", { sync: { archive: { flags: [42] } } }],
	])("rejects %s", (_label, raw) => {
		expect(() => validateConfig(raw, {})).toThrow(ConfigError);
	});

	test("reports schema errors as field paths and messages", () => {
		const error = validationError({
			storage: { root: "" },
			ai: { provider: "google", api_key: "" },
		});
		expect(error.message).toContain("Configuration validation failed");
		expect(error.issues).toEqual(
			expect.arrayContaining([
				{ path: "/storage/root", message: expect.any(String) },
				{ path: "/ai/api_key", message: expect.any(String) },
			]),
		);
	});

	test("aggregates missing environment references without including resolved secrets", () => {
		const error = validationError(
			{
				auth: {
					secret: "${SECRET}",
					credentials: { username: "${USER}", password: "${PASSWORD}" },
				},
				pieces: [
					{
						type: "book",
						fields: { title: "${TITLE}", date_consumed: "date" },
					},
				],
			},
			{ SECRET: "sensitive-value" },
		);
		expect(error.issues).toEqual(
			expect.arrayContaining([
				{
					path: "/auth/credentials/username",
					message: 'Environment variable "USER" is missing.',
				},
				{
					path: "/auth/credentials/password",
					message: 'Environment variable "PASSWORD" is missing.',
				},
				{
					path: "/pieces/0/fields/title",
					message: 'Environment variable "TITLE" is missing.',
				},
			]),
		);
		expect(error.message).not.toContain("sensitive-value");
	});

	test("retains interpolation, fallback, escaping and plain-string behavior", () => {
		const config = validateConfig(
			{
				url: {
					app: "http://${HOST}:${PORT}",
					app_assets: "${MISSING:-http://localhost:8080/path?query=1}",
					luzzle_assets: "${EMPTY}",
				},
				auth: { secret: "Value: $${SECRET}", credentials },
				storage: { root: "plain-string" },
				content: { text: { title: "${HOST}", description: "${HOST}" } },
			},
			{ HOST: "localhost", PORT: "8080", EMPTY: "", SECRET: "unused" },
		);
		expect(config.url).toEqual({
			app: "http://localhost:8080",
			app_assets: "http://localhost:8080/path?query=1",
			luzzle_assets: "",
		});
		expect(config.auth?.secret).toBe("Value: ${SECRET}");
		expect(config.storage.root).toBe("plain-string");
		expect(config.content.text).toEqual({
			title: "localhost",
			description: "localhost",
		});
		expect(config.theme.globals["font-size-root"]).toBe(22);
	});

	test("interpolates defaults with the supplied environment", () => {
		const config = validateConfig(
			{},
			{ LUZZLE_APP_URL: "https://example.com", LUZZLE_ASSET_SALT: "salt" },
		);
		expect(config.url.app).toBe("https://example.com");
		expect(config.assets.salt).toBe("salt");
	});

	test.each([
		{ auth: { secret: "${MISSING:-}", credentials } },
		{
			auth: {
				secret: "s",
				credentials: { username: "${EMPTY}", password: "p" },
			},
		},
		{ auth: { secret: "s", oidc: { ...oidc, issuer: "${EMPTY}" } } },
		{ ai: { provider: "google", api_key: "${EMPTY}" } },
		{ storage: { root: "${EMPTY}" } },
	])("validates nonempty constraints after interpolation: %j", (raw) => {
		expect(() => validateConfig(raw, { EMPTY: "" })).toThrow(ConfigError);
	});

	test.each(["8080", "${PORT}"])(
		"does not coerce numeric strings %j",
		(hmr_port) => {
			expect(() =>
				validateConfig({ network: { public: { hmr_port } } }, { PORT: "8080" }),
			).toThrow(ConfigError);
		},
	);
});

// Keep path-helper behavior independent of the schema validation contract.
describe("config path helpers", () => {
	describe("getConfigValue", () => {
		test("should return the correct value for a given path", () => {
			const config = {
				a: {
					b: {
						c: "value",
					},
				},
			} as unknown as TestConfig;
			const value = getConfigValue(config, "a.b.c");
			expect(value).toBe("value");
		});

		test("should return undefined for a non-existent path", () => {
			const config = {
				a: {
					b: {
						c: "value",
					},
				},
			} as unknown as TestConfig;
			const value = getConfigValue(config, "a.b.d");
			expect(value).toBeUndefined();
		});

		test("should return the value for a root-level key", () => {
			const config = {
				key: "value",
			} as unknown as TestConfig;
			const value = getConfigValue(config, "key");
			expect(value).toBe("value");
		});

		test("should return an object for a path to a non-leaf", () => {
			const config = {
				a: {
					b: {
						c: "value",
					},
				},
			} as unknown as TestConfig;
			const value = getConfigValue(config, "a.b");
			expect(value).toEqual({ c: "value" });
		});

		test("should return undefined for a path starting with a non-existent key", () => {
			const config = {
				a: {
					b: "value",
				},
			} as unknown as TestConfig;
			const value = getConfigValue(config, "x.y.z");
			expect(value).toBeUndefined();
		});

		test("should return undefined for an empty config", () => {
			const config = {} as unknown as TestConfig;
			const value = getConfigValue(config, "a.b");
			expect(value).toBeUndefined();
		});
	});

	describe("setConfigValue", () => {
		test("should correctly set a value at a given path", () => {
			const config = {
				a: {
					b: {
						c: "value",
					},
				},
			} as unknown as TestConfig;
			setConfigValue(config, "a.b.c", "new-value");
			expect(config.a.b.c).toBe("new-value");
		});

		test("should create intermediate objects if they don't exist", () => {
			const config = {
				a: {},
			} as unknown as TestConfig;
			setConfigValue(config, "a.b.c", "value");
			expect(config.a.b.c).toBe("value");
		});

		test("should set a value at a root-level key", () => {
			const config = {} as unknown as Record<string, unknown>;
			setConfigValue(config as unknown as TestConfig, "key", "value");
			expect(config.key).toBe("value");
		});

		test("should overwrite non-object intermediate when setting a nested path", () => {
			const config = {
				a: {
					b: "not-an-object",
				},
			} as unknown as TestConfig;
			setConfigValue(config, "a.b.c", "value");
			expect((config as unknown as { a: { b: { c: string } } }).a.b.c).toBe(
				"value",
			);
		});

		test("should set a value to null", () => {
			const config = {
				a: {
					b: {
						c: "value",
					},
				},
			} as unknown as TestConfig;
			setConfigValue(config, "a.b.c", null);
			expect(config.a.b.c).toBeNull();
		});

		test("should set a value to a number", () => {
			const config = {
				a: {
					b: {
						c: "value",
					},
				},
			} as unknown as TestConfig;
			setConfigValue(config, "a.b.c", 42);
			expect(config.a.b.c).toBe(42);
		});

		test("should create deeply nested objects from scratch", () => {
			const config = {} as unknown as TestConfig;
			setConfigValue(config, "a.b.c.d.e", "deep");
			expect(
				(config as unknown as { a: { b: { c: { d: { e: string } } } } }).a.b.c.d
					.e,
			).toBe("deep");
		});
	});
});
