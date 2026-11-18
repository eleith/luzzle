import {
	LSPClient,
	serverCompletion,
	signatureHelp,
	serverDiagnostics
} from '@codemirror/lsp-client'
import type { Transport } from '@codemirror/lsp-client'
import type { Extension } from '@codemirror/state'

type EditorLspCallbacks = {
	setExtension: (extension: Extension | null) => void
	setUnavailable: (unavailable: boolean) => void
}

type LspConnection = {
	socket: WebSocket
	client?: LSPClient
	openingTimeout: ReturnType<typeof setTimeout>
}

function createWebSocketTransport(socket: WebSocket, isCurrent: () => boolean): Transport {
	const handlers = new Set<(value: string) => void>()
	socket.onmessage = (event: MessageEvent) => {
		if (!isCurrent() || typeof event.data !== 'string') return
		for (const handler of handlers) handler(event.data)
	}
	return {
		send(message) {
			// Native notifications can already be queued when a session is disposed.
			if (isCurrent() && socket.readyState === WebSocket.OPEN) socket.send(message)
		},
		subscribe(handler) {
			handlers.add(handler)
		},
		unsubscribe(handler) {
			handlers.delete(handler)
		}
	}
}

export function createEditorLspSession(
	file: string,
	{ setExtension, setUnavailable }: EditorLspCallbacks
) {
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
	const socketUrl = `${protocol}//${window.location.host}/admin/lsp`
	const fileUri = `luzzle-web:///archive/${file.split('/').map(encodeURIComponent).join('/')}`
	let currentConnection: LspConnection | undefined
	let retryTimer: ReturnType<typeof setTimeout> | undefined
	let automaticRetryAvailable = true
	let disposed = false

	function isCurrent(connection: LspConnection) {
		return !disposed && currentConnection === connection
	}

	function disconnect() {
		const connection = currentConnection
		if (!connection) return
		// Detach first: plugin destruction closes its document before disconnect resets initialization.
		setExtension(null)
		currentConnection = undefined
		clearTimeout(connection.openingTimeout)
		connection.socket.onopen = null
		connection.socket.onmessage = null
		connection.socket.onerror = null
		connection.socket.onclose = null
		connection.client?.disconnect()
		connection.socket.close()
	}

	function handleFailure(error: unknown) {
		if (disposed) return
		console.warn('[lsp] language assistance disconnected:', error)
		disconnect()
		if (automaticRetryAvailable) {
			automaticRetryAvailable = false
			retryTimer = setTimeout(() => {
				retryTimer = undefined
				connect()
			}, 1000)
		} else {
			setUnavailable(true)
		}
	}

	async function initialize(connection: LspConnection) {
		const transport = createWebSocketTransport(connection.socket, () => isCurrent(connection))
		const client = new LSPClient({
			rootUri: 'luzzle-web:///archive',
			extensions: [serverCompletion(), signatureHelp(), serverDiagnostics()]
		})
		connection.client = client
		client.connect(transport)
		await client.initializing
		if (isCurrent(connection)) setExtension(client.plugin(fileUri, 'markdown'))
	}

	function connect() {
		if (disposed) return
		setUnavailable(false)
		try {
			const socket = new WebSocket(socketUrl)
			const connection: LspConnection = {
				socket,
				openingTimeout: setTimeout(() => {
					if (isCurrent(connection)) handleFailure(new Error('LSP connection did not open'))
				}, 5000)
			}
			currentConnection = connection
			socket.onerror = () => {
				if (isCurrent(connection)) handleFailure(new Error('LSP connection failed'))
			}
			socket.onclose = () => {
				if (isCurrent(connection)) handleFailure(new Error('LSP connection closed'))
			}
			socket.onopen = () => {
				if (!isCurrent(connection)) return
				clearTimeout(connection.openingTimeout)
				void initialize(connection).catch((error) => {
					if (isCurrent(connection)) handleFailure(error)
				})
			}
		} catch (error) {
			handleFailure(error)
		}
	}

	connect()
	return {
		retry() {
			if (!disposed && !currentConnection && !retryTimer) connect()
		},
		dispose() {
			disposed = true
			clearTimeout(retryTimer)
			disconnect()
		}
	}
}
