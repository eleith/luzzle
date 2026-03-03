import { describe, test, expect, vi, afterEach } from 'vitest'
import { transforms, cleanupAllTransforms } from './index.js'
import * as opengraph from './opengraph.js'

vi.mock('./attachment.js', () => ({ run: vi.fn(), cleanup: undefined }))
vi.mock('./image.js', () => ({ run: vi.fn(), cleanup: undefined }))
vi.mock('./highlight.js', () => ({ run: vi.fn(), cleanup: undefined }))
vi.mock('./opengraph.js', () => ({ run: vi.fn(), cleanup: vi.fn() }))

afterEach(() => {
	vi.clearAllMocks()
})

describe('transforms/index', () => {
	test('transforms has attachment, image, palette, highlight, opengraph in order', () => {
		expect([...transforms.keys()]).toEqual(['attachment', 'image', 'palette', 'highlight', 'opengraph'])
	})

	test('cleanupAllTransforms calls cleanup on transforms that have it', async () => {
		const cleanupSpy = vi.spyOn(opengraph, 'cleanup').mockResolvedValue(undefined)

		await cleanupAllTransforms()

		expect(cleanupSpy).toHaveBeenCalledOnce()
	})
})
