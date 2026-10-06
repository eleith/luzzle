import { TypeGuard } from "@sinclair/typebox";
import type { ValueError } from "@sinclair/typebox/errors";

export interface ConfigIssue {
	path: string;
	message: string;
	category?: string;
	line?: number;
	column?: number;
}

/** Keep TypeBox values/schemas out of diagnostics; explain the selected auth provider. */
export function configIssues(errors: Iterable<ValueError>): ConfigIssue[] {
	const issues: ConfigIssue[] = [];
	for (const error of errors) {
		let details: Iterable<ValueError> = [error];
		if (
			error.path === "/auth" &&
			TypeGuard.IsUnion(error.schema) &&
			error.value !== null &&
			typeof error.value === "object"
		) {
			const credentials = "credentials" in error.value;
			const oidc = "oidc" in error.value;
			if (credentials !== oidc) {
				const provider = credentials ? "credentials" : "oidc";
				const branch = error.schema.anyOf.findIndex(
					(schema) =>
						TypeGuard.IsObject(schema) && provider in schema.properties,
				);
				if (branch !== -1) details = error.errors[branch];
			}
		}
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
