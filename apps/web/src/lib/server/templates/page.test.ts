import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { validateConfig } from '@luzzle/web.config'
import { configSchema } from '@luzzle/web.templates/config'
import { expect, test } from 'vitest'
import { publishedPiece } from '#lib/pieces/viewer/fixtures/published.js'
import { preloadAuthoredPages, renderAuthoredPage } from './page.js'

test('a stateful page cannot leak draft data or job assets into a public render', async ({
	onTestFinished
}) => {
	const dir = await mkdtemp(join(tmpdir(), 'page-cache-'))
	onTestFinished(() => rm(dir, { recursive: true, force: true }))
	const file = join(dir, 'page.svelte')
	await writeFile(
		file,
		`<script module>let firstTitle;</script>
		<script>let { piece, helpers } = $props(); firstTitle ??= piece.title;</script>
		<a href={helpers.getPieceAssetUrl('cover', 'image.original')}>{firstTitle}</a>`
	)
	const config = validateConfig(
		{
			url: { app: 'https://app.example', luzzle_assets: 'https://cdn.example' },
			pieces: [
				{
					type: 'books',
					fields: { title: 'title', date_consumed: 'date' },
					templates: { page: { file: relative(process.cwd(), file) } }
				}
			]
		},
		{},
		{ schema: configSchema }
	)
	await preloadAuthoredPages(config)
	const preview = await renderAuthoredPage({ ...publishedPiece, title: 'Draft' }, [], config, {
		mode: 'preview',
		appUrl: config.url.app,
		job: 'private-job'
	})
	expect(preview?.html).toContain('Draft')
	expect(preview?.html).toContain('/admin/preview/private-job/asset/published/cover.jpg')

	const published = await renderAuthoredPage({ ...publishedPiece, title: 'Public' }, [], config)
	expect(published?.html).toContain('Public')
	expect(published?.html).not.toContain('Draft')
	expect(published?.html).toContain('https://cdn.example/pieces/assets/published/cover.jpg')
})
