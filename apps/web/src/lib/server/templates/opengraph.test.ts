import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { validateConfig } from '@luzzle/web.config'
import { configSchema } from '@luzzle/web.templates/config'
import { expect, test, vi } from 'vitest'
import { publishedPiece } from '#lib/pieces/viewer/fixtures/published.js'
import { reloadAuthoredTemplates } from './cache.js'
import { preloadAuthoredOpengraphs, renderAuthoredOpengraph } from './opengraph.js'

function configured(selection: { file: string } | { name: string }) {
	return validateConfig(
		{
			url: { app: 'https://app.example', luzzle_assets: 'https://cdn.example' },
			pieces: [
				{
					type: 'books',
					fields: { title: 'title', date_consumed: 'date' },
					templates: { opengraph: selection }
				}
			]
		},
		{},
		{ schema: configSchema }
	)
}

test('a stateful share design keeps draft markup and job output URLs out of published HTML', async ({
	onTestFinished
}) => {
	const dir = await mkdtemp(join(tmpdir(), 'share-cache-'))
	onTestFinished(() => rm(dir, { recursive: true, force: true }))
	const file = join(dir, 'card.svelte')
	await writeFile(
		file,
		`<script module>let firstTitle;</script>
		<script>let { piece, helpers } = $props(); firstTitle ??= piece.title;</script>
		<a href={helpers.getPieceAssetUrl('cover', 'image.original')}>{firstTitle}</a>
		<style>a { color: blue; }</style>`
	)
	const config = configured({ file: relative(process.cwd(), file) })
	await preloadAuthoredOpengraphs(config)
	if (!reloadAuthoredTemplates) await rm(file)
	const preview = await renderAuthoredOpengraph({ ...publishedPiece, title: 'Draft' }, config, {
		mode: 'preview',
		appUrl: config.url.app,
		job: 'private-job'
	})
	if (!preview || preview === 'failed') throw new Error('Expected rendered preview HTML')
	expect(preview.html).toContain('Draft')
	expect(preview.html).toContain('/admin/preview/private-job/asset/published/cover.jpg')
	expect(preview.css).toContain('blue')
	const published = await renderAuthoredOpengraph({ ...publishedPiece, title: 'Public' }, config)
	if (!published || published === 'failed') throw new Error('Expected rendered published HTML')
	expect(published.html).toContain('Public')
	expect(published.html).toMatch(/href="https:\/\/cdn\.example\/[^"]*published\/cover\.jpg"/)
	expect(published.html).not.toMatch(/Draft|private-job/)
})

test('only non-file selections request the built-in Share composition', async () => {
	expect(await renderAuthoredOpengraph(publishedPiece, configured({ name: 'book' }))).toBeNull()
	const config = configured({ file: 'missing/card.svelte' })
	using log = vi.spyOn(console, 'error').mockImplementation(() => {})
	expect(await renderAuthoredOpengraph(publishedPiece, config)).toBe('failed')
	expect(log).toHaveBeenCalledWith(expect.stringContaining(publishedPiece.slug), expect.any(Error))
	await expect(preloadAuthoredOpengraphs(config)).rejects.toThrow('card.svelte')
})
