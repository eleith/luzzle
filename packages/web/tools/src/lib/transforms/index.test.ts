import { describe, test, expect, vi, afterEach, MockInstance } from 'vitest'
import { transforms, runAllTransforms, cleanupAllTransforms } from './index.js'
import * as attachment from './attachment.js'
import * as image from './image.js'
import * as opengraph from './opengraph.js'
import { TransformInput } from './types.js'

vi.mock('./attachment.js', () => ({ run: vi.fn(), cleanup: undefined }))
vi.mock('./image.js', () => ({ run: vi.fn(), cleanup: undefined }))
vi.mock('./opengraph.js', () => ({ run: vi.fn(), cleanup: vi.fn() }))

afterEach(() => {
	vi.clearAllMocks()
})

const spies: { [key: string]: MockInstance } = {}

describe('transforms/index', () => {
	test('transformMap has attachment, image, opengraph keys', () => {
		expect(Object.keys(transforms)).toEqual(['attachment', 'image', 'opengraph'])
	})

	test('cleanupAllTransforms calls cleanup on transforms that have it', async () => {
		spies.openGraphCleanup = vi.spyOn(opengraph, 'cleanup').mockResolvedValue(undefined)
		await cleanupAllTransforms()

		expect(spies.openGraphCleanup).toHaveBeenCalledOnce()
	})

	test('runAllTransforms calls cleanup on transforms that have it', async () => {
		spies.openGraphRun = vi.spyOn(opengraph, 'run').mockResolvedValue()
		spies.imageRun = vi.spyOn(image, 'run').mockResolvedValue()
		spies.attachmentRun = vi.spyOn(attachment, 'run').mockResolvedValue()

		await runAllTransforms({} as TransformInput)

		expect(spies.openGraphRun).toHaveBeenCalledOnce()
		expect(spies.imageRun).toHaveBeenCalledOnce()
		expect(spies.attachmentRun).toHaveBeenCalledOnce()
	})
})
