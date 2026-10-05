export interface ConfigIssue {
	path: string;
	message: string;
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
