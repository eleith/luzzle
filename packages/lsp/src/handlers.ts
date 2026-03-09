import {
	RequestMessage,
	NotificationMessage,
	ResponseMessage,
} from 'vscode-jsonrpc/node.js'
import { maskDocument } from './masking.js'
import { debug } from './log.js'

export interface ProxyContext {
	schemaMapping: Record<string, string[]>
	initializeRequestId: number | string | null
}

export function createContext(): ProxyContext {
	return {
		schemaMapping: {},
		initializeRequestId: null,
	}
}

export type DiscoverSchemasFn = (rootUri: string) => {
	mapping: Record<string, string[]>
	tempDir: string | null
}

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
		debug(`discovered ${Object.keys(result.mapping).length} schema(s) from ${rootUri}`)
	}

	ctx.initializeRequestId = msg.id

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


export function handleDidOpen(msg: NotificationMessage): NotificationMessage {
	const params = (msg.params ?? {}) as Record<string, unknown>
	const textDocument = { ...((params['textDocument'] ?? {}) as Record<string, unknown>) }

	if (typeof textDocument['text'] === 'string') {
		textDocument['text'] = maskDocument(textDocument['text'])
	}

	textDocument['languageId'] = 'yaml'

	return { ...msg, params: { ...params, textDocument } }
}

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

export function handleInitializeResponse(msg: ResponseMessage): ResponseMessage {
	if (msg.result && typeof msg.result === 'object') {
		const result = { ...(msg.result as Record<string, unknown>) }
		const capabilities = { ...((result['capabilities'] ?? {}) as Record<string, unknown>) }

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

export function buildConfigurationResponse(msg: RequestMessage, ctx: ProxyContext): ResponseMessage {
	const params = (msg.params ?? {}) as Record<string, unknown>
	const items = (params['items'] ?? []) as Array<Record<string, unknown>>

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

		return null
	})

	return { jsonrpc: '2.0', id: msg.id, result }
}
