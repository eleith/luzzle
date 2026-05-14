import { describe, test, expect, vi } from 'vitest'
import { getTransforms, cleanupAllTransforms } from './index.js'

describe('transforms/index', () => {
	test('returns all six transforms in correct order', () => {
		const transforms = getTransforms()
		const names = [...transforms.keys()]

		expect(names).toEqual([
			'attachment',
			'image',
			'palette',
			'highlight',
			'markdown',
			'opengraph',
		])
	})

	test('each transform has a run function', () => {
		const transforms = getTransforms()

		for (const [name, transform] of transforms) {
			expect(transform.run, `${name} missing run`).toBeTypeOf('function')
		}
	})

	test('cleanupAllTransforms calls cleanup on transforms that have it', async () => {
		const mockCleanup = vi.fn().mockResolvedValue(undefined)

		const transforms = getTransforms()
		transforms.set('test-cleanup', {
			run: vi.fn(),
			cleanup: mockCleanup,
		})
		transforms.set('test-no-cleanup', {
			run: vi.fn(),
		})

		await cleanupAllTransforms()

		expect(mockCleanup).toHaveBeenCalledOnce()
	})

	test('cleanupAllTransforms handles transforms without cleanup', async () => {
		const transforms = getTransforms()

		// opengraph is the only built-in transform with cleanup
		const opengraph = transforms.get('opengraph')
		expect(opengraph?.cleanup).toBeTypeOf('function')

		// calling cleanupAllTransforms should not throw
		await expect(cleanupAllTransforms()).resolves.not.toThrow()
	})
})
