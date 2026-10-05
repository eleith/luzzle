import { describe, expect, test } from "vitest";
import { validateConfig } from "./config.js";
import { ConfigError } from "./errors.js";

function issues(raw: unknown, env: NodeJS.ProcessEnv = {}) {
	try {
		validateConfig(raw, env);
	} catch (error) {
		if (error instanceof ConfigError) return error.issues;
		throw error;
	}
	throw new Error("Expected invalid configuration");
}

describe("configuration diagnostics", () => {
	test("reports a resolved empty session secret at its field, without unrelated provider errors", () => {
		const result = issues(
			{
				auth: {
					secret: "${SECRET}",
					credentials: { username: "admin", password: "private-password" },
				},
			},
			{ SECRET: "" },
		);
		expect(result).toEqual([
			{
				path: "/auth/secret",
				message: "Expected string length greater or equal to 1",
			},
		]);
		expect(JSON.stringify(result)).not.toContain("private-password");
	});

	test("explains missing credentials fields for the selected credentials provider", () => {
		const result = issues({
			auth: { secret: "private-session", credentials: {} },
		});
		expect(new Set(result.map((issue) => issue.path))).toEqual(
			new Set(["/auth/credentials/username", "/auth/credentials/password"]),
		);
		expect(JSON.stringify(result)).not.toContain("private-session");
	});

	test("explains missing OIDC fields without suggesting a different provider", () => {
		const result = issues({
			auth: {
				secret: "private-session",
				oidc: { issuer: "https://issuer.example", clientId: "client" },
			},
		});
		expect(new Set(result.map((issue) => issue.path))).toEqual(
			new Set(["/auth/oidc/clientSecret"]),
		);
		expect(
			result.every(
				(issue) => Object.keys(issue).sort().join(",") === "message,path",
			),
		).toBe(true);
	});

	test.each([
		null,
		"invalid",
		{},
		{ secret: "s" },
		{
			secret: "s",
			credentials: { username: "admin", password: "p" },
			oidc: { issuer: "i", clientId: "c", clientSecret: "s" },
		},
	])(
		"keeps an auth-level diagnostic when there is no single selected provider: %j",
		(auth) => {
			expect(issues({ auth })).toEqual([
				{ path: "/auth", message: "Expected union value" },
			]);
		},
	);

	test("keeps non-auth union errors concise", () => {
		expect(
			issues({ theme: { markdown: { code: { light: "not-a-theme" } } } }),
		).toEqual([
			{ path: "/theme/markdown/code/light", message: "Expected union value" },
		]);
	});
});
