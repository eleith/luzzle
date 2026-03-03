import { describe, test, expect, vi, afterEach } from 'vitest'
import { transforms, transformMap, cleanupTransforms } from './index.js'

vi.mock('./attachment.js', () => ({ run: vi.fn(), cleanup: undefined }))
vi.mock('./image.js', () => ({ run: vi.fn(), cleanup: undefined }))
vi.mock('./opengraph.js', () => ({ run: vi.fn(), cleanup: vi.fn() }))

afterEach(() => {
	vi.clearAllMocks()
})

describe('transforms/index', () => {
	test('exports three transforms', () => {
		expect(transforms).toHaveLength(3)
	})

	test('transformMap has attachment, image, opengraph keys', () => {
		expect(Object.keys(transformMap)).toEqual(['attachment', 'image', 'opengraph'])
	})

	test('cleanupTransforms calls cleanup on transforms that have it', async () => {
		const { cleanup } = await import('./opengraph.js')

		await cleanupTransforms()

		expect(vi.mocked(cleanup)).toHaveBeenCalledOnce()
	})
})
