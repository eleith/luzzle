import type { Page, WebSocketRoute } from '@playwright/test'

type Message = {
	id?: number | string
	method?: string
	params?: {
		rootUri?: string
		textDocument?: { uri: string; version: number; text?: string; languageId?: string }
		contentChanges?: { text: string; range?: unknown }[]
	}
}

export class LspConnection {
	readonly messages: Message[] = []
	closed = false
	document: { uri: string; version: number; text: string } | undefined

	constructor(private readonly socket: WebSocketRoute) {
		socket.onClose(() => {
			this.closed = true
		})
		socket.onMessage((data) => {
			const message = JSON.parse(data.toString()) as Message
			this.messages.push(message)
			const document = message.params?.textDocument
			if (message.method === 'textDocument/didOpen' && document) {
				this.document = { uri: document.uri, version: document.version, text: document.text! }
			}
			if (message.method === 'textDocument/didChange' && document) {
				// These scenarios advertise full sync, not an incremental-edit protocol fixture.
				this.document = {
					uri: document.uri,
					version: document.version,
					text: message.params!.contentChanges![0].text
				}
			}
			if (message.id !== undefined && message.method !== 'initialize') {
				this.send({
					id: message.id,
					result:
						message.method === 'textDocument/completion'
							? [{ label: 'LSP fixture suggestion', kind: 1 }]
							: null
				})
			}
		})
	}

	get initialize() {
		return this.messages.find((message) => message.method === 'initialize')
	}

	acceptInitialize() {
		if (!this.initialize) throw new Error('No initialize request to answer')
		this.send({
			id: this.initialize.id,
			result: {
				capabilities: {
					textDocumentSync: { openClose: true, change: 1 },
					completionProvider: { resolveProvider: false }
				}
			}
		})
	}

	rejectInitialize() {
		if (!this.initialize) throw new Error('No initialize request to reject')
		this.send({
			id: this.initialize.id,
			error: { code: -32603, message: 'Language assistance temporarily unavailable' }
		})
	}

	diagnose(needle: string, message: string) {
		if (!this.document) throw new Error('No open document to diagnose')
		const offset = this.document.text.indexOf(needle)
		if (offset < 0) throw new Error(`Diagnostic text not found: ${needle}`)
		const lines = this.document.text.slice(0, offset).split('\n')
		const start = { line: lines.length - 1, character: lines.at(-1)!.length }
		this.send({
			method: 'textDocument/publishDiagnostics',
			params: {
				uri: this.document.uri,
				version: this.document.version,
				diagnostics: [
					{
						range: { start, end: { ...start, character: start.character + needle.length } },
						severity: 2,
						message
					}
				]
			}
		})
	}

	close() {
		return this.socket.close({ code: 1011, reason: 'Fixture connection interrupted' })
	}

	private send(message: object) {
		this.socket.send(JSON.stringify({ jsonrpc: '2.0', ...message }))
	}
}

export async function routeLsp(page: Page) {
	const connections: LspConnection[] = []
	// Do not connectToServer: the HTTP fixture deliberately has no LSP bridge.
	await page.routeWebSocket('**/admin/lsp', (socket) => {
		connections.push(new LspConnection(socket))
	})
	return connections
}
