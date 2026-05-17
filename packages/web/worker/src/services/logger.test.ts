import { describe, expect, test, vi, afterEach } from 'vitest'
import { log } from './logger.js'

describe('log', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	function captureLine() {
		let line: string | undefined
		const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
			line = typeof chunk === 'string' ? chunk : chunk.toString()
			return true
		})
		return {
			getLine: () => line,
			spy
		}
	}

	test('writes one JSON-line per call to stdout', () => {
		const cap = captureLine()
		log('info', 'hello')
		expect(cap.spy).toHaveBeenCalledOnce()
		expect(cap.getLine()?.endsWith('\n')).toBe(true)
	})

	test('includes ts (ISO), level, message', () => {
		const cap = captureLine()
		log('info', 'hello')
		const parsed = JSON.parse(cap.getLine()!.trimEnd())
		expect(parsed.level).toBe('info')
		expect(parsed.message).toBe('hello')
		expect(typeof parsed.ts).toBe('string')
		expect(new Date(parsed.ts).toISOString()).toBe(parsed.ts)
	})

	test('merges extra fields into the JSON line', () => {
		const cap = captureLine()
		log('warn', 'failure', { jobId: 42, queue: 'publish' })
		const parsed = JSON.parse(cap.getLine()!.trimEnd())
		expect(parsed.jobId).toBe(42)
		expect(parsed.queue).toBe('publish')
		expect(parsed.level).toBe('warn')
	})

	test('all log levels work', () => {
		for (const level of ['debug', 'info', 'warn', 'error'] as const) {
			const cap = captureLine()
			log(level, 'm')
			const parsed = JSON.parse(cap.getLine()!.trimEnd())
			expect(parsed.level).toBe(level)
		}
	})
})
