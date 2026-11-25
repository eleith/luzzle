import { TypeGuard } from "@sinclair/typebox";
import type { ValueError } from "@sinclair/typebox/errors";

export interface ConfigIssue {
	path: string;
	message: string;
	category?: string;
	line?: number;
	column?: number;
}

/** Report the invalid field in the selected config shape, not just "Expected union". */
function selectedObjectBranch({ path, schema, value }: ValueError): number {
	if (
		!TypeGuard.IsUnion(schema) ||
		!value ||
		typeof value !== "object" ||
		Array.isArray(value)
	)
		return -1;

	if (path === "/auth") {
		const credentials = Object.hasOwn(value, "credentials");
		if (credentials === Object.hasOwn(value, "oidc")) return -1;
		const provider = credentials ? "credentials" : "oidc";
		return schema.anyOf.findIndex(
			(branch) => TypeGuard.IsObject(branch) && provider in branch.properties,
		);
	}
	if (/^\/pieces\/[^/]*\/templates\/(icon|page|opengraph)$/.test(path)) {
		const hasFile = Object.hasOwn(value, "file");
		return schema.anyOf.findIndex(
			(branch) =>
				TypeGuard.IsObject(branch) &&
				Object.hasOwn(branch.properties, "file") === hasFile,
		);
	}
	return -1;
}

/** Keep TypeBox values and schemas out of diagnostics. */
export function configIssues(errors: Iterable<ValueError>): ConfigIssue[] {
	const issues: ConfigIssue[] = [];
	for (const error of errors) {
		const index = selectedObjectBranch(error);
		const details = index < 0 ? [error] : error.errors[index];
		for (const { path, message } of details) issues.push({ path, message });
	}
	return issues;
}

export class ConfigError extends Error {
	readonly issues: readonly ConfigIssue[];

	constructor(issues: readonly ConfigIssue[]) {
		super(
			`Configuration validation failed:\n${issues
				.map(({ path, message }) => `  ${path || "/"}: ${message}`)
				.join("\n")}`,
		);
		this.name = "ConfigError";
		this.issues = issues;
	}
}
