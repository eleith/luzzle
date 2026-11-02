import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { afterLoadIdle } from './after-load-idle.js'

let events: EventTarget

beforeEach(() => {
	vi.useFakeTimers()
	events = new EventTarget()
	vi.stubGlobal('document', { readyState: 'loading' })
	vi.stubGlobal('window', {
		addEventListener: events.addEventListener.bind(events),
		removeEventListener: events.removeEventListener.bind(events),
		requestIdleCallback: vi.fn((callback: () => void) => setTimeout(callback, 1)),
		cancelIdleCallback: clearTimeout,
		setTimeout,
		clearTimeout
	})
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

test('waits for page load and then an idle slot', () => {
	const work = vi.fn()
	afterLoadIdle(work)
	vi.runAllTimers()
	expect(window.requestIdleCallback).not.toHaveBeenCalled()
	expect(work).not.toHaveBeenCalled()

	events.dispatchEvent(new Event('load'))
	expect(window.requestIdleCallback).toHaveBeenCalledOnce()
	expect(work).not.toHaveBeenCalled()
	vi.runAllTimers()
	expect(work).toHaveBeenCalledOnce()
})

test('schedules idle work immediately if the page has already loaded', () => {
	vi.stubGlobal('document', { readyState: 'complete' })
	const work = vi.fn()
	afterLoadIdle(work)
	expect(window.requestIdleCallback).toHaveBeenCalledOnce()
	expect(work).not.toHaveBeenCalled()
	vi.runAllTimers()
	expect(work).toHaveBeenCalledOnce()
})

test('falls back to a timer after load when idle callbacks are unavailable', () => {
	vi.stubGlobal('window', { ...window, requestIdleCallback: undefined })
	const work = vi.fn()
	afterLoadIdle(work)
	vi.runAllTimers()
	expect(work).not.toHaveBeenCalled()
	events.dispatchEvent(new Event('load'))
	expect(work).not.toHaveBeenCalled()
	vi.runAllTimers()
	expect(work).toHaveBeenCalledOnce()
})

test.each([false, true])('cleanup cancels work with page already loaded: %s', (loaded) => {
	vi.stubGlobal('document', { readyState: loaded ? 'complete' : 'loading' })
	const work = vi.fn()
	const cancel = afterLoadIdle(work)
	cancel()
	events.dispatchEvent(new Event('load'))
	vi.runAllTimers()
	expect(work).not.toHaveBeenCalled()
})
