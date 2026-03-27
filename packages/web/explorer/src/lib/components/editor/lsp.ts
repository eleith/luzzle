import { LSPClient, languageServerExtensions } from '@codemirror/lsp-client'
import type { Transport } from '@codemirror/lsp-client'
import type { Extension } from '@codemirror/state'

function createWebSocketTransport(url: string): Promise<Transport> {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(url)
		const handlers = new Set<(value: string) => void>()

		ws.onopen = () => {
			resolve({
				send: (msg: string) => ws.send(msg),
				subscribe: (handler: (value: string) => void) => {
					handlers.add(handler)
				},
				unsubscribe: (handler: (value: string) => void) => {
					handlers.delete(handler)
				}
			})
		}

		ws.onmessage = (e: MessageEvent) => {
			const data = typeof e.data === 'string' ? e.data : ''
			for (const handler of handlers) handler(data)
		}

		ws.onerror = () => reject(new Error('WebSocket connection failed'))
		ws.onclose = () => {
			handlers.clear()
		}
	})
}

let client: LSPClient | null = null

export async function createLSPExtension(fileUri: string): Promise<Extension> {
	if (!client) {
		client = new LSPClient({
			extensions: languageServerExtensions()
		})

		try {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
			const transport = await createWebSocketTransport(
				`${protocol}//${window.location.host}/editor/lsp`
			)
			client.connect(transport)
		} catch (e) {
			console.error('[lsp] failed to connect:', e)
			client = null
			return []
		}
	}

	return client.plugin(fileUri, 'markdown')
}

export function destroyLSPClient() {
	if (client) {
		client.disconnect()
		client = null
	}
}
