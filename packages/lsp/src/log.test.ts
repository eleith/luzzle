import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('log', () => {
	beforeEach(() => {
		vi.resetModules()
	})

	it('debug logs when LUZZLE_LSP_DEBUG is 1', async () => {
		vi.stubEnv('LUZZLE_LSP_DEBUG', '1')
		const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
		
		const { debug } = await import('./log.js')
		debug('test debug')
		
		expect(spy).toHaveBeenCalledWith('[luzzle-lsp] test debug\n')
		spy.mockRestore()
		vi.unstubAllEnvs()
	})

	it('debug does not log when LUZZLE_LSP_DEBUG is not 1', async () => {
		vi.stubEnv('LUZZLE_LSP_DEBUG', '0')
		const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
		
		const { debug } = await import('./log.js')
		debug('test debug')
		
		expect(spy).not.toHaveBeenCalled()
		spy.mockRestore()
		vi.unstubAllEnvs()
	})

	it('error logs unconditionally', async () => {
		const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
		
		const { error } = await import('./log.js')
		error('test error')
		
		expect(spy).toHaveBeenCalledWith('[luzzle-lsp] test error\n')
		spy.mockRestore()
	})
})