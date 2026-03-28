import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('luzzle-lsp', () => {
	let route, injectRootUri

	beforeEach(async () => {
		vi.resetModules()
		process.env.LUZZLE_LSP_ROOT = '/tmp/test-archive'
		const mod = await import('./luzzle-lsp.js')
		route = mod.route
		injectRootUri = mod.injectRootUri
	})

	afterEach(() => {
		delete process.env.LUZZLE_LSP_ROOT
	})

	describe('route', () => {
		it('exports correct shape', () => {
			expect(route).toMatchObject({
				name: 'luzzle-lsp',
				command: 'luzzle-lsp',
				args: ['--stdio'],
			})
			expect(route.spawnOptions.env.LUZZLE_LSP_ROOT).toBe('/tmp/test-archive')
			expect(route.transform).toBe(injectRootUri)
		})
	})

	describe('injectRootUri', () => {
		it('injects rootUri into initialize request', () => {
			const msg = {
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: { rootUri: null, capabilities: {} },
			}

			const result = injectRootUri(msg)

			expect(result.params.rootUri).toBe('file:///tmp/test-archive')
		})

		it('passes through non-initialize messages unchanged', () => {
			const msg = {
				jsonrpc: '2.0',
				method: 'textDocument/didOpen',
				params: { textDocument: { uri: 'file:///app/archive/piece.md' } },
			}

			const result = injectRootUri(msg)

			expect(result).toBe(msg)
		})

		it('passes through messages without params', () => {
			const msg = { jsonrpc: '2.0', method: 'initialized' }

			const result = injectRootUri(msg)

			expect(result).toBe(msg)
		})
	})
})
