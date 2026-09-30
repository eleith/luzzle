import { afterEach, expect, test, vi } from 'vitest'
import { pieceFrontMatterFromPrompt } from '@luzzle/core'
import type { PieceFrontmatter, PieceFrontmatterSchema } from '@luzzle/core'
import { promptToPiece } from './pieces'

vi.mock('./config', () => ({ config: { ai: { api_key: 'test-key' } } }))
vi.mock('./storage', () => ({ getStorage: vi.fn() }))
vi.mock('@luzzle/core', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	pieceFrontMatterFromPrompt: vi.fn()
}))

afterEach(() => {
	vi.mocked(pieceFrontMatterFromPrompt).mockReset()
})

const schema = {
	title: 'books',
	type: 'object',
	properties: { title: { type: 'string' } },
	required: ['title']
} as PieceFrontmatterSchema<PieceFrontmatter>

test('web generation reports SDK aborts as timeouts', async () => {
	vi.mocked(pieceFrontMatterFromPrompt).mockRejectedValueOnce(
		new Error('exception AbortError: This operation was aborted sending request')
	)

	await expect(promptToPiece(schema, 'prompt')).rejects.toThrow(
		'A Gemini request timed out after 5 minutes'
	)
})

test('web generation preserves unrelated provider errors', async () => {
	vi.mocked(pieceFrontMatterFromPrompt).mockRejectedValueOnce(new Error('quota exceeded'))

	await expect(promptToPiece(schema, 'prompt')).rejects.toThrow('quota exceeded')
})

test('web generation returns successful metadata', async () => {
	vi.mocked(pieceFrontMatterFromPrompt).mockResolvedValueOnce({ title: 'Generated' })

	await expect(promptToPiece(schema, 'prompt')).resolves.toEqual({ title: 'Generated' })
})
