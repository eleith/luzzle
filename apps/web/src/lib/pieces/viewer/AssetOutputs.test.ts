import { expect, test } from 'vitest'
import { render } from 'svelte/server'
import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
import AssetOutputs from './AssetOutputs.svelte'

function renderOutputs(
	assets: PublicWebPieceAsset[],
	fileUrl: (path: string) => string | undefined = () => undefined
) {
	return render(AssetOutputs, { props: { assets, fileUrl } }).body.replace(/<!--[\s\S]*?-->/g, '')
}

test('a recorded file and its inline source remain separately inspectable', () => {
	const output: PublicWebPieceAsset = {
		asset_key: 'rendered-note',
		transformation: 'markdown',
		asset_path: 'generated/note.html',
		mime_type: 'text/html',
		content: '<script>untrustedSource()</script><h1>Recorded note</h1>'
	}
	const fileUrl = (path: string) =>
		path === output.asset_path ? '/admin/preview/current-job/asset/generated/note.html' : undefined

	const html = renderOutputs([output], fileUrl)

	const link = html.match(/<a\b[^>]*>/)?.[0]
	expect(link).toContain('href="/admin/preview/current-job/asset/generated/note.html"')
	expect(link).toContain('target="_blank"')
	expect(link).toMatch(/\brel="[^"]*\bnoopener\b[^"]*"/)
	expect(link).toMatch(/\brel="[^"]*\bnoreferrer\b[^"]*"/)
	expect(link).toContain('aria-label="View markdown: generated/note.html"')
	expect(html).toContain('aria-label="Show Markdown: Asset 1, Content"')
	expect(html).toContain('aria-expanded="false"')
	expect(html).not.toContain('untrustedSource()')
	expect(html).not.toContain('<h1>Recorded note')
})

test('different assets with the same output name have distinct, linked disclosure targets', () => {
	const first: PublicWebPieceAsset = {
		asset_key: 'first-snippet',
		transformation: 'highlight',
		mime_type: 'text/html',
		content: '<pre>First source</pre>'
	}
	const second = { ...first, asset_key: 'second-snippet', content: '<pre>Second source</pre>' }

	const html = renderOutputs([first, second])
	const buttons = [...html.matchAll(/<button\b[^>]*>/g)].map(([tag]) => tag)
	const rows = [...html.matchAll(/<tr\b[^>]*>/g)].map(([tag]) => tag)
	const targets = buttons.map((button) => button.match(/aria-controls="([^"]+)"/)?.[1])

	expect(buttons).toHaveLength(2)
	expect(buttons[0]).toContain('aria-label="Show Highlight: Asset 1, Content"')
	expect(buttons[1]).toContain('aria-label="Show Highlight: Asset 2, Content"')
	expect(new Set(targets).size).toBe(2)
	for (const target of targets) {
		expect(target).toBeTruthy()
		const row = rows.find((row) => row.includes(`id="${target}"`))
		expect(row).toBeDefined()
		expect(row).toMatch(/\shidden(?:\s|=|>)/)
	}
	expect(html).not.toContain('First source')
	expect(html).not.toContain('Second source')
})

test('missing or unavailable files remain visible without invented View links', () => {
	const unavailable: PublicWebPieceAsset = {
		asset_key: 'unavailable',
		transformation: 'attachment',
		asset_path: 'missing.pdf',
		mime_type: 'application/pdf'
	}
	const unsafe = { ...unavailable, asset_key: 'unsafe', asset_path: '../private.pdf' }
	const unrecorded = { ...unavailable, asset_key: 'unrecorded', asset_path: null }

	const html = renderOutputs([unavailable, unsafe, unrecorded])

	expect(html).toContain('missing.pdf')
	expect(html).toContain('../private.pdf')
	expect(html).toContain('Unavailable')
	expect(html).toContain('Not recorded')
	expect(html).not.toMatch(/<a\b/)
})

test('only nonempty recorded values offer source disclosure', () => {
	const embedded: PublicWebPieceAsset = {
		asset_key: 'missing-value',
		transformation: 'palette',
		mime_type: 'application/json',
		is_embedded: 1
	}
	const empty = { ...embedded, asset_key: 'empty-value', content: '' }
	const jsonNull = { ...embedded, asset_key: 'json-null', content: 'null' }

	const html = renderOutputs([embedded, empty, jsonNull])

	expect(html).toContain('Not recorded')
	expect(html).toContain('Empty')
	expect(html.match(/<button\b/g)).toHaveLength(1)
	expect(html).toContain('aria-label="Show Palette: Asset 3, Content"')
})
