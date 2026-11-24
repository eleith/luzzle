import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import { loadIconDesign } from './icon.js'

const filename = fileURLToPath(
	new URL('../../../../demo/content/templates/icon/example.svelte', import.meta.url)
)

const book: PublicWebPiece = {
	id: 'one',
	key: 'one',
	title: 'Illustrated',
	slug: 'illustrated',
	type: 'books',
	date_added: 1,
	keywords: '[]',
	metadata: { jacket: 'front' },
	assets: [
		{
			asset_key: 'front',
			asset_path: 'books/front cover.jpg',
			mime_type: 'image/jpeg',
			transformation: 'image.original'
		},
		{
			asset_key: 'front',
			asset_path: 'books/small cover.jpg',
			mime_type: 'image/jpeg',
			transformation: 'image.s.jpg'
		}
	]
}
test('one external design renders the mapped cover or fallback for each book on the server', async () => {
	const design = await loadIconDesign({
		filename,
		mapping: { image: 'jacket' },
		context: {
			mode: 'published',
			appUrl: 'https://app.example',
			assetBaseUrl: 'https://cdn.example'
		}
	})
	const placement = { size: { width: 125 } }
	const html = design.render(book, { ...placement, lazy: true })
	expect(html).toContain('https://cdn.example/pieces/assets/books/small%20cover.jpg')
	expect(html).toContain('loading="lazy"')
	expect(design.render({ ...book, title: 'Ink & Paper', assets: [] }, placement)).toContain(
		'Ink &amp; Paper'
	)
	expect(design.css.trim()).not.toBe('')
})

test('a module that remembers its first title cannot leak a draft into a published icon', async ({
	onTestFinished
}) => {
	const dir = await mkdtemp(join(tmpdir(), 'icon-cache-'))
	onTestFinished(() => rm(dir, { recursive: true, force: true }))
	const filename = join(dir, 'icon.svelte')
	await writeFile(
		filename,
		`<script module>let firstTitle;</script><script>let { piece } = $props(); firstTitle ??= piece.title;</script><b>{firstTitle}</b>`
	)
	const appUrl = 'https://app.example'
	const props = { size: { width: 500 } }
	const preview = await loadIconDesign({
		filename,
		context: { mode: 'preview', appUrl, job: 'draft' }
	})
	expect(preview.render({ ...book, title: 'Private draft' }, props)).toContain('Private draft')
	const published = await loadIconDesign({ filename, context: { mode: 'published', appUrl } })
	const publicHtml = published.render(book, props)
	expect(publicHtml).toContain(book.title)
	expect(publicHtml).not.toContain('Private draft')
})

test('two placements of one icon get independent IDs, dimensions and loading hints', async ({
	onTestFinished
}) => {
	const dir = await mkdtemp(join(tmpdir(), 'icon-placement-'))
	onTestFinished(() => rm(dir, { recursive: true, force: true }))
	const filename = join(dir, 'icon.svelte')
	await writeFile(
		filename,
		`<script>let { size, lazy } = $props(); const id = $props.id();</script><img {id} alt="" width={size.width} loading={lazy ? 'lazy' : 'eager'} />`
	)
	const design = await loadIconDesign({
		filename,
		context: { mode: 'published', appUrl: 'https://app.example' }
	})
	const first = design.render(book, { size: { width: 80 } })
	const second = design.render(book, { size: { width: 125 }, lazy: true })
	const id = (html: string) => /<img\b[^>]*\bid="([^"]+)"/.exec(html)?.[1]
	expect(id(first)).toBeTruthy()
	expect(id(second)).toBeTruthy()
	expect(id(first)).not.toBe(id(second))
	expect(first).toContain('width="80"')
	expect(first).toContain('loading="eager"')
	expect(second).toContain('width="125"')
	expect(second).toContain('loading="lazy"')
})
