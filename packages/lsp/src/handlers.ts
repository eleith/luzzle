import {
	RequestMessage,
	NotificationMessage,
	ResponseMessage,
} from 'vscode-jsonrpc/node.js'
import { maskDocument } from './masking.js'
import { debug } from './log.js'

// ---------------------------------------------------------------------------
// Session state — created once per proxy lifetime in main()
// ---------------------------------------------------------------------------

export interface ProxyContext {
	/** Schema mappings: { "file:///tmp/.../books.json": ["*.books.md"] } */
	schemaMapping: Record<string, string[]>
	/** Track the initialize request id so we can intercept the response */
	initializeRequestId: number | string | null
	/** Temp directory for transformed schemas (cleaned up on exit) */
	tempSchemaDir: string | null
}

export function createContext(): ProxyContext {
	return {
		schemaMapping: {},
		initializeRequestId: null,
		tempSchemaDir: null,
	}
}

// ---------------------------------------------------------------------------
// Schema discovery function signature (injected for testability)
// ---------------------------------------------------------------------------

export type DiscoverSchemasFn = (rootUri: string) => {
	mapping: Record<string, string[]>
	tempDir: string | null
}

// ---------------------------------------------------------------------------
// Client → Server handlers
// ---------------------------------------------------------------------------

/**
 * Intercepts the `initialize` request to inject schema mappings into the
 * yaml-language-server's initialization options.
 */
export function handleInitialize(
	msg: RequestMessage,
	ctx: ProxyContext,
	discover: DiscoverSchemasFn,
): RequestMessage {
	const params = (msg.params ?? {}) as Record<string, unknown>
	const rootUri = params['rootUri'] as string | undefined

	if (rootUri) {
		const result = discover(rootUri)
		ctx.schemaMapping = result.mapping
		ctx.tempSchemaDir = result.tempDir
		debug(`discovered ${Object.keys(result.mapping).length} schema(s) from ${rootUri}`)
	}

	ctx.initializeRequestId = msg.id

	// Merge schema config into initializationOptions, preserving existing settings
	const existingOptions = (params['initializationOptions'] ?? {}) as Record<string, unknown>
	const existingSettings = ((existingOptions['settings'] ?? {}) as Record<string, unknown>)
	const existingYaml = ((existingSettings['yaml'] ?? {}) as Record<string, unknown>)

	params['initializationOptions'] = {
		...existingOptions,
		settings: {
			...existingSettings,
			yaml: {
				...existingYaml,
				schemas: ctx.schemaMapping,
				validate: true,
				completion: true,
				hover: true,
			},
		},
	}

	return { ...msg, params }
}

/**
 * Intercepts `textDocument/didOpen` to mask the document body and rewrite
 * the languageId from "markdown" to "yaml".
 */
export function handleDidOpen(msg: NotificationMessage): NotificationMessage {
	const params = (msg.params ?? {}) as Record<string, unknown>
	const textDocument = { ...((params['textDocument'] ?? {}) as Record<string, unknown>) }

	if (typeof textDocument['text'] === 'string') {
		textDocument['text'] = maskDocument(textDocument['text'])
	}

	// yaml-language-server ignores non-yaml languageIds
	textDocument['languageId'] = 'yaml'

	return { ...msg, params: { ...params, textDocument } }
}

/**
 * Intercepts `textDocument/didChange` to mask the document body in each
 * content change entry. Expects full document sync (enforced by the proxy
 * modifying the server's capabilities in the initialize response).
 */
export function handleDidChange(msg: NotificationMessage): NotificationMessage {
	const params = (msg.params ?? {}) as Record<string, unknown>
	const contentChanges = params['contentChanges']

	if (Array.isArray(contentChanges)) {
		params['contentChanges'] = contentChanges.map(
			(change: Record<string, unknown>) => {
				if (typeof change['text'] === 'string') {
					return { ...change, text: maskDocument(change['text']) }
				}
				return change
			},
		)
	}

	return { ...msg, params: { ...params } }
}

// ---------------------------------------------------------------------------
// Server → Client handlers
// ---------------------------------------------------------------------------

/**
 * Intercepts the `initialize` response to force full document sync.
 * This ensures `textDocument/didChange` always contains the full document text,
 * which is required for the masking approach to work correctly.
 */
export function handleInitializeResponse(msg: ResponseMessage): ResponseMessage {
	if (msg.result && typeof msg.result === 'object') {
		const result = { ...(msg.result as Record<string, unknown>) }
		const capabilities = { ...((result['capabilities'] ?? {}) as Record<string, unknown>) }

		// Force full document sync (TextDocumentSyncKind.Full = 1)
		const sync = capabilities['textDocumentSync']
		if (typeof sync === 'object' && sync !== null) {
			capabilities['textDocumentSync'] = { ...(sync as Record<string, unknown>), change: 1 }
		} else {
			capabilities['textDocumentSync'] = { openClose: true, change: 1 }
		}

		result['capabilities'] = capabilities
		return { ...msg, result }
	}
	return msg
}

/**
 * Responds to `workspace/configuration` requests from the yaml-language-server.
 * Returns the schema mapping settings so the server doesn't overwrite the
 * init-time config with empty settings from Neovim.
 */
export function buildConfigurationResponse(msg: RequestMessage, ctx: ProxyContext): ResponseMessage {
	const params = (msg.params ?? {}) as Record<string, unknown>
	const items = (params['items'] ?? []) as Array<Record<string, unknown>>

	// Each item in the request gets a corresponding response element
	const result = items.map((item) => {
		const section = item['section'] as string | undefined

		if (section === 'yaml') {
			return {
				schemas: ctx.schemaMapping,
				validate: true,
				completion: true,
				hover: true,
			}
		}

		// Return null for sections we don't handle
		return null
	})

	return { jsonrpc: '2.0', id: msg.id, result }
}
