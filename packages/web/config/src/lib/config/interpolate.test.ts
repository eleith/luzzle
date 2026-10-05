import { afterEach, describe, expect, test, vi } from "vitest";
import { ConfigError } from "./errors.js";
import { interpolate } from "./interpolate.js";

const issue = (path: string, name: string) => ({
	path,
	message: `Environment variable "${name}" is missing.`,
});

afterEach(() => vi.unstubAllEnvs());

describe("config environment interpolation", () => {
	test("substitutes multiple references in a string", () => {
		expect(
			interpolate("https://${HOST}:${PORT}/", {
				HOST: "example.test",
				PORT: "8080",
			}),
		).toBe("https://example.test:8080/");
	});

	test("uses process.env when no environment is supplied", () => {
		vi.stubEnv("LUZZLE_INTERPOLATION_TEST", "configured");
		expect(interpolate("${LUZZLE_INTERPOLATION_TEST}")).toBe("configured");
	});

	test("preserves the existing broader environment-name syntax", () => {
		expect(
			interpolate("${mixedCase}/${WITH-DASH}/${1}", {
				mixedCase: "lower",
				"WITH-DASH": "dash",
				"1": "number",
			}),
		).toBe("lower/dash/number");
	});

	test("uses explicit fallbacks, including empty strings and URLs", () => {
		expect(
			interpolate(["${MISSING:-}", "${URL:-https://example.test/path}"], {}),
		).toEqual(["", "https://example.test/path"]);
	});

	test("treats an existing empty environment value as present", () => {
		expect(interpolate("${EMPTY:-fallback}", { EMPTY: "" })).toBe("");
	});

	test("treats undefined environment values as missing", () => {
		expect(interpolate("${MISSING:-fallback}", { MISSING: undefined })).toBe(
			"fallback",
		);
		expect(() => interpolate("${MISSING}", { MISSING: undefined })).toThrow(
			ConfigError,
		);
	});

	test("expands nested arrays and objects without mutating caller input", () => {
		const input = {
			auth: { secret: "${SECRET}" },
			sync: { flags: ["--header", "${HEADER}"] },
			count: 0,
			enabled: false,
			empty: null,
		};
		const snapshot = structuredClone(input);
		expect(
			interpolate(input, { SECRET: "resolved", HEADER: "X-Example: value" }),
		).toEqual({
			auth: { secret: "resolved" },
			sync: { flags: ["--header", "X-Example: value"] },
			count: 0,
			enabled: false,
			empty: null,
		});
		expect(input).toEqual(snapshot);
	});

	test("preserves escaped references instead of interpreting them as missing variables", () => {
		expect(
			interpolate("$${MISSING} $$ ${PRESENT} $5", { PRESENT: "value" }),
		).toBe("${MISSING} $ value $5");
	});

	test("does not interpolate replacement values or fallbacks a second time", () => {
		expect(
			interpolate("${PRESENT}", { PRESENT: "${NOT_ANOTHER_LOOKUP}" }),
		).toBe("${NOT_ANOTHER_LOOKUP}");
		expect(interpolate("${MISSING:-$$}", {})).toBe("$$");
	});

	test("does not use inherited object properties as environment variables", () => {
		expect(() => interpolate("${toString}", {})).toThrow(
			'Environment variable "toString" is missing.',
		);
	});

	test("aggregates missing names and paths, deduplicating repetitions within a field", () => {
		const input = {
			url: "${Z_HOST}",
			auth: { secret: "${A_SECRET}/${A_SECRET}" },
			sync: { flags: ["${Z_HOST}", "${A_SECRET}"] },
		};
		expect(() => interpolate(input, {})).toThrowError(
			expect.objectContaining({
				name: "ConfigError",
				issues: [
					issue("/auth/secret", "A_SECRET"),
					issue("/sync/flags/1", "A_SECRET"),
					issue("/sync/flags/0", "Z_HOST"),
					issue("/url", "Z_HOST"),
				],
			}),
		);
	});

	test("never includes supplied or partially substituted secret values in diagnostics", () => {
		let error: unknown;
		try {
			interpolate(
				{ auth: { secret: "literal-private-${SUPPLIED}-${MISSING}" } },
				{
					SUPPLIED: "environment-private",
				},
			);
		} catch (caught) {
			error = caught;
		}
		expect(error).toBeInstanceOf(ConfigError);
		expect(error).toMatchObject({ issues: [issue("/auth/secret", "MISSING")] });
		expect(String(error)).not.toContain("literal-private");
		expect(String(error)).not.toContain("environment-private");
		expect(JSON.stringify(error)).not.toContain("literal-private");
		expect(JSON.stringify(error)).not.toContain("environment-private");
	});

	test("uses JSON Pointer escaping for field paths", () => {
		expect(() =>
			interpolate({ "a/b": { "~key": "${MISSING}" } }, {}),
		).toThrowError(
			expect.objectContaining({ issues: [issue("/a~1b/~0key", "MISSING")] }),
		);
	});

	test("preserves a __proto__ data key without changing the output prototype", () => {
		const input: unknown = JSON.parse('{"__proto__":{"value":"${VALUE}"}}');
		const output = interpolate(input, { VALUE: "resolved" });
		expect(output).toEqual(JSON.parse('{"__proto__":{"value":"resolved"}}'));
		expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
	});

	test("formats a root-value error with a readable root path", () => {
		expect(() => interpolate("${MISSING}", {})).toThrow(
			'Configuration validation failed:\n  /: Environment variable "MISSING" is missing.',
		);
	});

	test("leaves ordinary strings and non-string values unchanged", () => {
		for (const value of ["ordinary text", "", 0, false, null, undefined]) {
			expect(interpolate(value, {})).toBe(value);
		}
	});
});
