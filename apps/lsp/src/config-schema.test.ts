import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
	createMessageConnection,
	StreamMessageReader,
	StreamMessageWriter,
} from "vscode-jsonrpc/node.js";
import type { MessageConnection } from "vscode-jsonrpc/node.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const credentials =
	"  credentials:\n    username: admin\n    password: ${PASSWORD}\n";
const oidc =
	"  oidc:\n    issuer: ${OIDC_ISSUER}\n    clientId: client\n    clientSecret: ${CLIENT_SECRET}\n";
const auth = "auth:\n  secret: ${SECRET}\n";

const fixtures: { name: string; yaml: string; errors: RegExp[] }[] = [
	{ name: "minimal defaults, auth and AI omitted", yaml: "{}\n", errors: [] },
	{ name: "credentials", yaml: auth + credentials, errors: [] },
	{
		name: "OIDC without defaulted display name",
		yaml: auth + oidc,
		errors: [],
	},
	{
		name: "short nonempty secret",
		yaml: "auth:\n  secret: s\n" + credentials,
		errors: [],
	},
	{
		name: "missing secret",
		yaml: "auth:\n" + credentials,
		errors: [/Missing property "secret"/],
	},
	{
		name: "empty secret",
		yaml: 'auth:\n  secret: ""\n' + credentials,
		errors: [/minimum length of 1/],
	},
	{
		name: "missing password",
		yaml: auth + "  credentials:\n    username: admin\n",
		errors: [/Missing property "password"/],
	},
	{
		name: "both auth providers",
		yaml: auth + credentials + oidc,
		errors: [/Property (oidc|credentials) is not allowed/],
	},
	{
		name: "legacy auth enabled and type",
		yaml: auth + "  enabled: true\n  type: credentials\n" + credentials,
		errors: [/Property enabled is not allowed/, /Property type is not allowed/],
	},
	{
		name: "wrong secret type",
		yaml: "auth:\n  secret: 123\n" + credentials,
		errors: [/Incorrect type.*string/],
	},
	{
		name: "configured AI",
		yaml: "ai:\n  provider: google\n  api_key: ${GOOGLE_API_KEY}\n",
		errors: [],
	},
	{
		name: "missing AI key",
		yaml: "ai:\n  provider: google\n",
		errors: [/Missing property "api_key"/],
	},
	{
		name: "missing AI provider",
		yaml: "ai:\n  api_key: ${GOOGLE_API_KEY}\n",
		errors: [/Missing property "provider"/],
	},
	{
		name: "AI fields have no implicit defaults",
		yaml: "ai: {}\n",
		errors: [/Missing property "provider"/, /Missing property "api_key"/],
	},
	{
		name: "unsupported AI provider",
		yaml: "ai:\n  provider: unsupported\n  api_key: ${GOOGLE_API_KEY}\n",
		errors: [/Value (is not accepted|must be).*google/],
	},
];

// Exercise the generated artifact through the actual editor protocol, not a validator
// or a re-created schema. No runtime configuration or deployment secrets are needed.
describe("generated web config schema in yaml-language-server", () => {
	let directory: string | undefined;
	let child: ChildProcessWithoutNullStreams | undefined;
	let closed: Promise<void> | undefined;
	let connection: MessageConnection | undefined;
	type Diagnostic = { message: string };
	const pending = new Map<string, (diagnostics: Diagnostic[]) => void>();

	beforeAll(async () => {
		directory = await mkdtemp(join(tmpdir(), "luzzle-config-schema-"));
		await copyFile(
			new URL(
				"../../../packages/web/config/src/lib/config/web.config.schema.json",
				import.meta.url,
			),
			join(directory, "web.config.schema.json"),
		);
		child = spawn(
			process.execPath,
			[
				require.resolve("yaml-language-server/bin/yaml-language-server"),
				"--stdio",
			],
			{ cwd: directory, stdio: ["pipe", "pipe", "pipe"] },
		);
		closed = new Promise((resolve) => child!.once("close", () => resolve()));
		// Drain stderr so a server error cannot fill its pipe and stall the test.
		child.stderr.resume();
		connection = createMessageConnection(
			new StreamMessageReader(child.stdout),
			new StreamMessageWriter(child.stdin),
		);
		connection.onRequest(
			"workspace/configuration",
			({ items }: { items: { section: string }[] }) =>
				items.map(({ section }) =>
					section === "yaml"
						? {
								validate: true,
								hover: true,
								completion: true,
								schemaStore: { enable: false },
								kubernetesCRDStore: { enable: false },
								schemas: {},
							}
						: {},
				),
		);
		connection.onNotification(
			"textDocument/publishDiagnostics",
			({ uri, diagnostics }: { uri: string; diagnostics: Diagnostic[] }) =>
				pending.get(uri)?.(diagnostics),
		);
		connection.listen();
		await connection.sendRequest("initialize", {
			processId: process.pid,
			rootUri: pathToFileURL(directory).href,
			capabilities: {
				workspace: { configuration: true },
				textDocument: {
					hover: { contentFormat: ["markdown", "plaintext"] },
					completion: { completionItem: { snippetSupport: true } },
				},
			},
		});
		await connection.sendNotification("initialized", {});
	}, 10_000);

	// Hooks also run on assertion failures/timeouts, including a failed handshake.
	afterAll(async () => {
		pending.clear();
		connection?.dispose();
		child?.kill("SIGKILL");
		await closed;
		if (directory) await rm(directory, { recursive: true, force: true });
	});

	it("validates the demo through its checked-in schema header", async () => {
		const file = new URL("../../web/demo/config.yaml", import.meta.url);
		const uri = file.href;
		const text = await readFile(file, "utf8");
		const diagnostics = new Promise<Diagnostic[]>((resolve) =>
			pending.set(uri, resolve),
		);
		try {
			await connection!.sendNotification("textDocument/didOpen", {
				textDocument: { uri, languageId: "yaml", version: 1, text },
			});
			expect(await diagnostics).toEqual([]);
		} finally {
			pending.delete(uri);
			await connection!.sendNotification("textDocument/didClose", {
				textDocument: { uri },
			});
		}
	}, 10_000);

	it.each(fixtures)(
		"$name",
		async ({ name, yaml, errors }) => {
			const file = join(directory!, `${name.replaceAll(" ", "-")}.yaml`);
			const uri = pathToFileURL(file).href;
			// No schema association is configured: only this relative modeline can load it.
			const text =
				"# yaml-language-server: $schema=./web.config.schema.json\n" + yaml;
			await writeFile(file, text);
			const diagnostics = new Promise<Diagnostic[]>((resolve) =>
				pending.set(uri, resolve),
			);
			try {
				await connection!.sendNotification("textDocument/didOpen", {
					textDocument: { uri, languageId: "yaml", version: 1, text },
				});
				// Wait for this document's notification, not a sleep or another file's result.
				const messages = (await diagnostics).map(({ message }) => message);
				if (errors.length === 0) expect(messages).toEqual([]);
				else {
					for (const error of errors) {
						expect(messages).toEqual(
							expect.arrayContaining([expect.stringMatching(error)]),
						);
					}
				}

				if (name === "missing secret") {
					type Item = { label: string };
					const completion = await connection!.sendRequest<
						Item[] | { items: Item[] } | null
					>("textDocument/completion", {
						textDocument: { uri },
						position: { line: 2, character: 2 },
					});
					const items = Array.isArray(completion)
						? completion
						: (completion?.items ?? []);
					expect(items.map(({ label }) => label)).toContain("secret");
				}
				if (name === "credentials") {
					const hover = await connection!.sendRequest<{
						contents: unknown;
					} | null>("textDocument/hover", {
						textDocument: { uri },
						position: { line: 2, character: 4 },
					});
					expect(JSON.stringify(hover?.contents)).toMatch(/session|signing/i);
				}
			} finally {
				pending.delete(uri);
				await connection!.sendNotification("textDocument/didClose", {
					textDocument: { uri },
				});
			}
		},
		10_000,
	);
});
