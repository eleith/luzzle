import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import { join } from "path";
import {
	createConnection as createLSPConnection,
	TextDocumentSyncKind,
	DiagnosticSeverity,
	ProposedFeatures,
	CodeActionKind,
	TextEdit,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { lint } from "markdownlint/promise";
import { applyFixes } from "markdownlint";

/**
 * Convert a markdownlint LintError to an LSP Diagnostic.
 * When errorRange is absent, highlights the full line using the document text.
 */
function lintErrorToDiagnostic(error, lines) {
	const line = error.lineNumber - 1;
	let startChar = 0;
	let endChar = lines ? lines[line]?.length || 0 : 0;

	if (error.errorRange) {
		startChar = error.errorRange[0] - 1;
		endChar = startChar + error.errorRange[1];
	}

	return {
		range: {
			start: { line, character: startChar },
			end: { line, character: endChar },
		},
		severity: DiagnosticSeverity.Warning,
		source: "markdownlint",
		code: error.ruleNames[0],
		message: `${error.ruleNames[1]}: ${error.ruleDescription}`,
		data: error.fixInfo || undefined,
	};
}

/**
 * Convert a fixable LintError into a QuickFix CodeAction.
 */
function lintErrorToQuickFix(error, uri, version) {
	const fix = error.fixInfo;
	const line = (fix.lineNumber || error.lineNumber) - 1;
	const col = (fix.editColumn || 1) - 1;
	const deleteCount = fix.deleteCount || 0;
	const insertText = fix.insertText || "";

	const range = {
		start: { line, character: col },
		end: { line, character: col + deleteCount },
	};
	const edit = TextEdit.replace(range, insertText);

	return {
		title: `Fix ${error.ruleNames[0]} (${error.ruleNames[1]})`,
		kind: CodeActionKind.QuickFix,
		diagnostics: [lintErrorToDiagnostic(error, null)],
		edit: {
			documentChanges: [
				{
					textDocument: { uri, version },
					edits: [edit],
				},
			],
		},
	};
}

/**
 * Load markdownlint config from .markdownlint.json in the given directory.
 * Returns null if not found or invalid.
 */
async function loadConfig(rootPath) {
	try {
		const configPath = join(rootPath, ".markdownlint.json");
		const content = await readFile(configPath, "utf-8");
		return JSON.parse(content);
	} catch {
		return null;
	}
}

/**
 * Run markdownlint on a document and send diagnostics.
 */
async function validateDocument(document, connection, config) {
	try {
		const text = document.getText();
		const uri = document.uri;
		const lines = text.split("\n");
		const options = { strings: { [uri]: text }, handleRuleFailures: true };
		if (config) {
			options.config = config;
		}
		const results = await lint(options);
		const errors = results[uri] || [];
		const diagnostics = errors.map((e) => lintErrorToDiagnostic(e, lines));
		connection.sendDiagnostics({ uri, diagnostics, version: document.version });
	} catch (err) {
		console.error("[markdownlint-lsp] validation error:", err);
		connection.sendDiagnostics({
			uri: document.uri,
			diagnostics: [],
			version: document.version,
		});
	}
}

/**
 * Create and wire up the markdownlint LSP server.
 */
/* c8 ignore next */
const defaultConnectionFactory = () =>
	createLSPConnection(ProposedFeatures.all);
function createServer(connectionFactory = defaultConnectionFactory) {
	const connection = connectionFactory();
	const documents = new Map();
	let config = null;

	connection.onInitialize((params) => {
		const uri = params.workspaceFolders?.[0]?.uri || params.rootUri;
		const rootPath = uri
			? uri.startsWith("file://")
				? uri.slice(7)
				: uri
			: null;
		if (rootPath) {
			loadConfig(rootPath).then((c) => {
				config = c;
			});
		}
		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Full,
				codeActionProvider: {
					codeActionKinds: [
						CodeActionKind.QuickFix,
						CodeActionKind.SourceFixAll,
					],
				},
			},
		};
	});

	connection.onDidOpenTextDocument((params) => {
		const { uri, languageId, version, text } = params.textDocument;
		const doc = TextDocument.create(uri, languageId, version, text);
		documents.set(uri, doc);
		validateDocument(doc, connection, config);
	});

	connection.onDidChangeTextDocument((params) => {
		const doc = documents.get(params.textDocument.uri);
		if (doc) {
			const updated = TextDocument.update(
				doc,
				params.contentChanges,
				params.textDocument.version,
			);
			documents.set(params.textDocument.uri, updated);
			validateDocument(updated, connection, config);
		}
	});

	connection.onDidCloseTextDocument((params) => {
		documents.delete(params.textDocument.uri);
		connection.sendDiagnostics({
			uri: params.textDocument.uri,
			diagnostics: [],
		});
	});

	connection.onCodeAction((params) => {
		const doc = documents.get(params.textDocument.uri);
		if (!doc) return [];

		const text = doc.getText();
		const actions = [];
		const fixableErrors = [];

		for (const diag of params.context.diagnostics) {
			if (diag.source !== "markdownlint" || !diag.data) continue;

			const error = {
				lineNumber: diag.range.start.line + 1,
				ruleNames: [diag.code, diag.message.split(":")[0]],
				ruleDescription: diag.message.split(": ").slice(1).join(": "),
				fixInfo: diag.data,
			};
			actions.push(
				lintErrorToQuickFix(error, params.textDocument.uri, doc.version),
			);
			fixableErrors.push(error);
		}

		if (fixableErrors.length >= 2) {
			const fixed = applyFixes(text, fixableErrors);
			const lastLine = doc.lineCount - 1;
			const lastLineLength = doc.positionAt(text.length).character;
			const fullRange = {
				start: { line: 0, character: 0 },
				end: { line: lastLine, character: lastLineLength },
			};

			actions.push({
				title: "Fix all markdownlint issues",
				kind: CodeActionKind.SourceFixAll,
				edit: {
					documentChanges: [
						{
							textDocument: {
								uri: params.textDocument.uri,
								version: doc.version,
							},
							edits: [TextEdit.replace(fullRange, fixed)],
						},
					],
				},
			});
		}

		return actions;
	});

	return { connection, documents };
}

function shouldRespond() {
	return true;
}

const route = {
	name: "markdownlint-lsp",
	command: "node",
	args: [
		fileURLToPath(new URL("./markdownlint-lsp.js", import.meta.url)),
		"--stdio",
	],
	shouldRespond,
};

/* c8 ignore start */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { connection } = createServer();
	connection.listen();
}
/* c8 ignore stop */

export {
	route,
	createServer,
	validateDocument,
	lintErrorToDiagnostic,
	lintErrorToQuickFix,
	loadConfig,
	shouldRespond,
};
