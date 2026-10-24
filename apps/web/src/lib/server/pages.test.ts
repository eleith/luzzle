import { beforeEach, expect, test, vi } from 'vitest'
import { loadPageMarkdown } from './pages.js'

const { config, loadMarkdownFile } = vi.hoisted(() => ({
	config: { paths: { config: '/deployment/config/config.yaml' } },
	loadMarkdownFile: vi.fn()
}))
vi.mock('$lib/server/config', () => ({ config }))
vi.mock('$lib/content/markdown/files.server.js', () => ({ loadMarkdownFile }))

beforeEach(() => {
	vi.clearAllMocks()
	config.paths.config = '/deployment/config/config.yaml'
	loadMarkdownFile.mockResolvedValue('<p>Section</p>')
})

test('omission does not read a file or select feed fallback copy', async () => {
	expect(await loadPageMarkdown()).toBeUndefined()
	expect(loadMarkdownFile).not.toHaveBeenCalled()
})

test('relative references follow the logical supplied config path', async () => {
	expect(await loadPageMarkdown('site/home.md')).toBe('<p>Section</p>')
	expect(loadMarkdownFile).toHaveBeenCalledExactlyOnceWith('/deployment/config/site/home.md')
	config.paths.config = '/deployment/config.yaml'
	await loadPageMarkdown('site/home.md')
	expect(loadMarkdownFile).toHaveBeenLastCalledWith('/deployment/site/home.md')
})

test('loads only the requested section rather than discovering or preloading other pages', async () => {
	await loadPageMarkdown('home.md')
	expect(loadMarkdownFile.mock.calls).toEqual([['/deployment/config/home.md']])
})

test('an explicit file needs a recorded config path and loading errors are not masked', async () => {
	config.paths.config = ''
	expect(() => loadPageMarkdown('home.md')).toThrow('supplied config path')
	config.paths.config = '/deployment/config.yaml'
	const failure = new Error('Unreadable Markdown')
	loadMarkdownFile.mockRejectedValueOnce(failure)
	await expect(loadPageMarkdown('home.md')).rejects.toBe(failure)
})
