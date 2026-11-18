import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { Extension } from '@codemirror/state'
import { createEditorLspSession } from './lsp'

class FakeWebSocket extends EventTarget {
	static readonly CONNECTING = 0
	static readonly OPEN = 1
	static readonly CLOSED = 3
	static instances: FakeWebSocket[] = []

	readyState: number = FakeWebSocket.CONNECTING
	onopen: ((event: Event) => void) | null = null
	onclose: ((event: Event) => void) | null = null
	onmessage: ((event: MessageEvent<string>) => void) | null = null
	readonly sent: { method?: string; id?: number }[] = []

	constructor(readonly url: string) {
		super()
		FakeWebSocket.instances.push(this)
	}

	open() {
		this.readyState = FakeWebSocket.OPEN
		const event = new Event('open')
		this.onopen?.(event)
		this.dispatchEvent(event)
	}

	send(message: string) {
		if (this.readyState === FakeWebSocket.CONNECTING) throw new Error('Socket is not open')
		if (this.readyState === FakeWebSocket.OPEN) this.sent.push(JSON.parse(message))
	}

	close() {
		if (this.readyState === FakeWebSocket.CLOSED) return
		this.readyState = FakeWebSocket.CLOSED
		const event = new Event('close')
		this.onclose?.(event)
		this.dispatchEvent(event)
	}

	finishInitialization() {
		const request = this.sent.find((message) => message.method === 'initialize')
		if (!request) throw new Error('Client has not requested initialization')
		const event = new MessageEvent('message', {
			data: JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { capabilities: {} } })
		})
		this.onmessage?.(event)
		this.dispatchEvent(event)
	}
}

beforeEach(() => {
	vi.useFakeTimers()
	FakeWebSocket.instances = []
	vi.stubGlobal('window', { location: { protocol: 'https:', host: 'editor.test' } })
	vi.stubGlobal('WebSocket', FakeWebSocket)
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

function callbacks() {
	return {
		setExtension: vi.fn<(extension: Extension | null) => void>(),
		setUnavailable: vi.fn<(unavailable: boolean) => void>()
	}
}

test('a socket that never opens exhausts its retry; disposing a manual attempt cancels its deadline', async () => {
	const updates = callbacks()
	const session = createEditorLspSession('notes.book.md', updates)
	const first = FakeWebSocket.instances[0]
	expect(first.readyState).toBe(FakeWebSocket.CONNECTING)
	expect(first.sent).toEqual([])
	expect(updates.setUnavailable).not.toHaveBeenCalledWith(true)

	await vi.advanceTimersToNextTimerAsync() // Opening deadline.
	expect(first.readyState).toBe(FakeWebSocket.CLOSED)
	expect(updates.setUnavailable).not.toHaveBeenCalledWith(true)
	await vi.advanceTimersToNextTimerAsync() // The one automatic retry.
	expect(FakeWebSocket.instances).toHaveLength(2)
	const retry = FakeWebSocket.instances[1]
	expect(retry.readyState).toBe(FakeWebSocket.CONNECTING)

	await vi.runAllTimersAsync()
	expect(retry.readyState).toBe(FakeWebSocket.CLOSED)
	expect(updates.setUnavailable).toHaveBeenLastCalledWith(true)
	expect(FakeWebSocket.instances).toHaveLength(2)

	session.retry()
	expect(FakeWebSocket.instances).toHaveLength(3)
	const manual = FakeWebSocket.instances[2]
	expect(manual.readyState).toBe(FakeWebSocket.CONNECTING)
	expect(updates.setUnavailable).toHaveBeenLastCalledWith(false)
	await vi.runAllTimersAsync()
	expect(manual.readyState).toBe(FakeWebSocket.CLOSED)
	expect(updates.setUnavailable).toHaveBeenLastCalledWith(true)
	expect(FakeWebSocket.instances).toHaveLength(3) // Manual retry did not replenish the budget.

	session.retry()
	const connecting = FakeWebSocket.instances[3]
	session.dispose()
	expect(connecting.readyState).toBe(FakeWebSocket.CLOSED)
	expect(vi.getTimerCount()).toBe(0)
	updates.setExtension.mockClear()
	updates.setUnavailable.mockClear()

	await vi.runAllTimersAsync()
	expect(FakeWebSocket.instances).toHaveLength(4)
	expect(updates.setExtension).not.toHaveBeenCalled()
	expect(updates.setUnavailable).not.toHaveBeenCalled()
})

test('installs only after initialization, detaches on disconnect, and ignores initialization completed during disposal', async () => {
	const updates = callbacks()
	const session = createEditorLspSession('notes.book.md', updates)
	const first = FakeWebSocket.instances[0]
	first.open()
	await Promise.resolve()
	expect(first.sent).toContainEqual(expect.objectContaining({ method: 'initialize' }))
	expect(updates.setExtension.mock.calls.every(([extension]) => extension === null)).toBe(true)

	first.finishInitialization()
	await vi.advanceTimersByTimeAsync(0)
	expect(updates.setExtension).toHaveBeenLastCalledWith(expect.anything())
	first.close()
	expect(updates.setExtension).toHaveBeenLastCalledWith(null)
	expect(updates.setUnavailable).not.toHaveBeenCalledWith(true)

	await vi.advanceTimersToNextTimerAsync()
	const retry = FakeWebSocket.instances[1]
	retry.open()
	await Promise.resolve()
	updates.setExtension.mockClear()
	expect(retry.sent).toContainEqual(expect.objectContaining({ method: 'initialize' }))

	retry.finishInitialization()
	// Let the native client finish its handshake, but dispose before the session's await resumes.
	await Promise.resolve()
	expect(retry.sent).toContainEqual(expect.objectContaining({ method: 'initialized' }))
	expect(updates.setExtension).not.toHaveBeenCalled()
	session.dispose()
	expect(retry.readyState).toBe(FakeWebSocket.CLOSED)
	updates.setExtension.mockClear()
	updates.setUnavailable.mockClear()

	await vi.runAllTimersAsync()
	expect(vi.getTimerCount()).toBe(0)
	expect(updates.setExtension).not.toHaveBeenCalled()
	expect(updates.setUnavailable).not.toHaveBeenCalled()
})
