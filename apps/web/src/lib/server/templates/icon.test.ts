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
		}
	]
}
test('one external design renders the mapped cover or fallback for each book on the server', async () => {
	const design = await loadIconDesign(
		{ filename, mapping: { cover: 'jacket' } },
		{ mode: 'published', appUrl: 'https://app.example', assetBaseUrl: 'https://cdn.example' }
	)
	const placement = { size: { width: 125 } }
	expect(design.render(book, placement)).toContain(
		'https://cdn.example/pieces/assets/books/front%20cover.jpg'
	)
	expect(design.render({ ...book, title: 'Ink & Paper', assets: [] }, placement)).toContain(
		'Ink &amp; Paper'
	)
	expect(design.css.trim()).not.toBe('')
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
	const design = await loadIconDesign(
		{ filename },
		{ mode: 'published', appUrl: 'https://app.example' }
	)
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
