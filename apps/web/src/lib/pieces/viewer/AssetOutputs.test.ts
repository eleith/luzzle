import { readFileSync } from 'node:fs'
import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
import AssetOutputs from './AssetOutputs.svelte'
import { asset } from './fixtures/published'
import { groupAssetOutputs } from './assets'
import { assetPathToUrl } from '$lib/pieces/assets'
import { fileType, transformCaption, transformFamily } from './presentation'

function groupAssets(assets: Parameters<typeof groupAssetOutputs>[0], base: string) {
	return groupAssetOutputs(assets, (path) => assetPathToUrl(path, base))
}

// Quoted attributes can contain literal > characters from recorded paths.
const tagPattern = /<\/?[a-z][\w-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi

function elements(html: string, tag: string) {
	const stack: number[] = []
	const matches: { start: number; html: string }[] = []
	for (const match of html.matchAll(tagPattern)) {
		if (!new RegExp(`^</?${tag}\\b`, 'i').test(match[0])) continue
		if (!match[0].startsWith('</')) stack.push(match.index)
		else {
			const start = stack.pop()
			if (start != null) {
				matches.push({ start, html: html.slice(start, match.index + match[0].length) })
			}
		}
	}
	return matches.sort((a, b) => a.start - b.start).map((match) => match.html)
}

function cellValue(html: string) {
	return html
		.replace(/<span\b[^>]*class="cell-label[^"]*"[^>]*>[\s\S]*?<\/span>/g, '')
		.replace(/<a\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/a>/g, (link) =>
			(link.match(/\btitle="([^"]*)"/)?.[1] ?? '').replaceAll('&quot;', '"')
		)
		.replace(tagPattern, '')
		.trim()
}

function table(html: string, caption: string) {
	const found = elements(html, 'table').find(
		(candidate) => cellValue(elements(candidate, 'caption')[0] ?? '') === caption
	)
	expect(found, `table caption: ${caption}`).toBeDefined()
	return found!
}

function rows(html: string) {
	// Metadata projections only; expectDisclosureRows separately checks EVERY detail row.
	return elements(html, 'tr')
		.filter((row) => !isSourceRow(row))
		.map((row) =>
			elements(row, 'th')
				.concat(elements(row, 'td'))
				.map((cell) => cellValue(cell))
		)
}

function allLinks(html: string) {
	return elements(html, 'a')
}

// Existing counts describe recorded files (View), not secondary actions.
function fileLinks(html: string) {
	return allLinks(html).filter((link) => link.endsWith('>View</a>'))
}

function escapedText(value: string) {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
}

function escapedAttribute(value: string) {
	return escapedText(value).replaceAll('"', '&quot;')
}

const columns = ['Output', 'Field', 'Type', 'Value']

function valueRow(output: string, field: string, mime: string, value: string) {
	return [escapedText(output), escapedText(field), fileType(mime), value]
}

function expectShowValue(html: string, output: string, content: string, ordinal = 1) {
	const label = escapedAttribute(`Show ${transformCaption(output)}: Asset ${ordinal}, Content`)
	const buttons = elements(html, 'button').filter((button) =>
		button.includes(`aria-label="${label}"`)
	)
	expect(buttons).toHaveLength(1)
	expect(buttons[0]).toContain('type="button"')
	expect(buttons[0]).toMatch(/>Show<\/button>$/)
	expect(buttons[0]).not.toContain('disabled')
	expect(buttons[0]).toContain('aria-expanded="false"')
	expect(buttons[0]).toContain('aria-controls=')
	// Text-only comparison avoids mistaking aria-expanded="false" for JSON payload.
	expect(cellValue(html)).not.toContain(escapedText(content))
}

function isSourceRow(row: string) {
	return /^<tr\b[^>]*class="source-row(?:[ "\s])/.test(row)
}

function expectDisclosureRows(html: string, assets: PublicWebPieceAsset[]) {
	const expected = groupAssets(assets, '/cdn').transforms.flatMap((family) =>
		family.values.filter((value) => value.value !== null && value.value !== '')
	)
	const detailRows = elements(html, 'tr').filter(isSourceRow)
	const buttons = elements(html, 'button')
	expect(detailRows).toHaveLength(expected.length)
	expect(buttons).toHaveLength(expected.length)
	const ids: string[] = []
	for (const body of elements(html, 'tbody')) {
		const allRows = elements(body, 'tr')
		for (const [index, row] of allRows.entries()) {
			if (!isSourceRow(row)) continue
			const opening = row.match(tagPattern)![0]
			const id = opening.match(/\bid="([^"]+)"/)?.[1]
			expect(id).toMatch(/-source-\d+-\d+-\d+$/)
			ids.push(id!)
			expect(opening).toContain('role="row"')
			expect(opening).toMatch(/\shidden(?:="")?(?:\s|>)/)
			expect(elements(row, 'th')).toHaveLength(0)
			const cells = elements(row, 'td')
			expect(cells).toHaveLength(1)
			expect(cells[0]).toContain('role="cell"')
			expect(cells[0]).toContain('colspan="4"')
			expect(cells[0]).toMatch(/class="source-cell(?:[ "\s])/)
			expect(cellValue(cells[0])).toBe('')
			expect(cells[0]).not.toContain('cell-label')
			expect(elements(row, 'table')).toHaveLength(0)
			const trigger = elements(allRows[index - 1] ?? '', 'button')
			expect(trigger).toHaveLength(1)
			expect(trigger[0]).toContain(`aria-controls="${id}"`)
			expect(trigger[0]).toContain('aria-expanded="false"')
			expect(trigger[0]).toMatch(/aria-label="Show [^"]+: Asset \d+, Content"/)
			expect(trigger[0]).toMatch(/>Show<\/button>$/)
		}
	}
	expect(new Set(ids).size).toBe(ids.length)
	for (const button of buttons) {
		const id = button.match(/aria-controls="([^"]+)"/)?.[1]
		expect(ids.filter((candidate) => candidate === id)).toHaveLength(1)
	}
	expect(html).not.toMatch(/\bdata-(?:source|value|payload)=/)
	for (const tag of ['pre', 'code', 'script', 'style', 'iframe'])
		expect(elements(html, tag)).toHaveLength(0)
}

function fileRow(output: string, path: string, type: string) {
	return [escapedText(output), 'File', type, path]
}

function expectFileRow(html: string, path: string, type: string, output: string) {
	expect(rows(html)).toContainEqual(fileRow(output, path, type))
}

function expectUnavailableRow(html: string, path: string, type: string, output: string) {
	const row = elements(html, 'tr').find((row) =>
		elements(row, 'td').some((cell) => cell.includes(`<bdi dir="ltr">${path}</bdi>`))
	)
	expect(row).toBeDefined()
	expectFileRow(row!.replace(/<small\b[^>]*>Unavailable<\/small>/g, ''), path, type, output)
	expect(allLinks(row!)).toHaveLength(0)
	expect(elements(row!, 'small').map(cellValue)).toEqual(['Unavailable'])
	expect(row).toContain('title="No usable file link"')
}

function expectFileViews(html: string) {
	const views = fileLinks(html)
	expect(allLinks(html)).toHaveLength(views.length)
	expect(html).not.toMatch(/\sdownload(?:\s|=|>)/)
	for (const link of views) {
		expect(link).toMatch(/>View<\/a>$/)
		expect(link).toContain('aria-label="View ')
		expect(link).toContain('title=')
		expect(link).not.toContain('truncated')
		expect(link).toContain('target="_blank"')
		expect(link).toContain('rel="noopener noreferrer"')
		expect(link).not.toMatch(/\sdownload(?:\s|=|>)/)
		const href = link.match(/\bhref="([^"]*)"/)?.[1]
		expect(href).toBeDefined()
	}
}

function renderAssets(assets: PublicWebPieceAsset[], base = '/cdn') {
	const html = render(AssetOutputs, {
		props: {
			assets,
			fileUrl: (path) => assetPathToUrl(path, base),
			heading: 'Published assets'
		}
	}).body.replace(/<!--[\s\S]*?-->/g, '')
	expect(html).toMatch(/<h2\b[^>]*>Published assets<\/h2>/)
	expect(elements(html, 'caption').map(cellValue)).toEqual(
		groupAssets(assets, base).transforms.map((family) => escapedText(transformCaption(family.name)))
	)
	for (const candidate of elements(html, 'table')) {
		const head = elements(candidate, 'thead')[0]
		const headers = elements(head, 'th')
		expect(headers.map(cellValue)).toEqual(columns)
		for (const header of headers) expect(header).toContain('scope="col"')
		const bodies = elements(candidate, 'tbody')
		for (const body of bodies) {
			const groupHeads = elements(body, 'th').filter((cell) => cell.includes('scope="rowgroup"'))
			expect(groupHeads).toHaveLength(bodies.length > 1 ? 1 : 0)
			for (const row of elements(body, 'tr')) {
				const headers = elements(row, 'th')
				const cells = elements(row, 'td')
				if (isSourceRow(row)) {
					expect(headers).toHaveLength(0)
					expect(cells).toHaveLength(1)
					expect(cells[0]).toContain('colspan="4"')
					continue
				}
				expect(headers).toHaveLength(1)
				if (headers[0].includes('scope="rowgroup"')) expect(cells).toHaveLength(0)
				else {
					expect(headers[0]).toContain('scope="row"')
					expect(cells).toHaveLength(3)
				}
			}
			for (const groupHead of groupHeads) {
				expect(groupHead).toContain('role="rowheader"')
				expect(groupHead).toContain(`colspan="${headers.length}"`)
				expect(groupHead).not.toContain('cell-label')
				expect(cellValue(groupHead)).toMatch(/^Asset \d+$/)
			}
		}
		expect(elements(candidate, 'table')).toHaveLength(1)
	}
	for (const excluded of [
		'Technical details',
		'>Key<',
		'<details',
		'<summary',
		'>Role<',
		'>Open<',
		'>MIME<',
		'>Status<',
		'>Recorded<',
		'Original assets',
		'Generated files',
		'Image variants',
		'>Variant<',
		'>Images<',
		'Colors (palette)',
		'class="swatch',
		' style=',
		'Open recorded file',
		'<p ',
		'<ul',
		'No published assets recorded.',
		'No generated share image recorded.',
		'No file path recorded',
		'Original unavailable',
		'separate from the reconstructed Share tab',
		'may differ',
		'>Available<'
	])
		expect(html).not.toContain(excluded)
	expectFileViews(html)
	expectDisclosureRows(html, assets)
	return html
}

test('every recorded family has one generic caption and retains each full output', () => {
	const html = renderAssets(
		[
			asset('image.original', 'cover #?.jpg'),
			asset('attachment', 'cover.pdf', 'cover', 'application/pdf'),
			asset('image.s.webp', 'cover/s.webp', 'cover', 'image/webp'),
			asset('image.s.webp', 'cover/s.webp', 'cover', 'image/webp'),
			asset('image.m.avif', 'cover/m.avif', 'cover', 'image/avif'),
			asset('opengraph', 'piece/share.png', 'piece', 'image/png'),
			asset('custom', 'files/other.zip', 'other', 'application/zip'),
			{ ...asset('markdown', null, 'cover', 'text/html'), content: '<h1>PRIVATE INLINE</h1>' },
			{ ...asset('palette', null), content: 'PRIVATE PALETTE' },
			{ ...asset('highlight', null), content: 'PRIVATE HIGHLIGHT', is_embedded: 1 }
		],
		'https://cdn.test/prefix/'
	)
	for (const [output, path, type] of [
		['image.original', 'cover #?.jpg', 'JPEG'],
		['image.s.webp', 'cover/s.webp', 'WebP'],
		['image.m.avif', 'cover/m.avif', 'AVIF']
	]) {
		const files = table(html, 'Image')
		expectFileRow(files, path, type, output)
		expect(elements(files, 'tbody')).toHaveLength(1)
		expect(fileLinks(files)).toHaveLength(3)
		expect(files).not.toContain('colspan=')
		expect(files).not.toContain('cover.pdf')
	}
	expectFileRow(table(html, 'Attachment'), 'cover.pdf', 'PDF', 'attachment')
	expectFileRow(table(html, 'Custom'), 'files/other.zip', 'ZIP', 'custom')
	expect(html).toContain('title="files/other.zip"')
	expectFileRow(table(html, 'Opengraph'), 'piece/share.png', 'PNG', 'opengraph')
	expect(html).toContain('https://cdn.test/prefix/pieces/assets/cover%20%23%3F.jpg')
	expect(fileLinks(html)).toHaveLength(6)
	expect(rows(table(html, 'Markdown'))).toContainEqual(
		valueRow('markdown', 'Content', 'text/html', 'Show')
	)
	expect(html).not.toContain('PRIVATE INLINE')
	expect(rows(table(html, 'Palette'))).toContainEqual(
		valueRow('palette', 'Content', 'image/jpeg', 'Show')
	)
	expect(rows(table(html, 'Highlight'))).toContainEqual(
		valueRow('highlight', 'Content', 'image/jpeg', 'Show')
	)
	expect(elements(html, 'caption').map(cellValue)).toEqual([
		'Image',
		'Attachment',
		'Opengraph',
		'Custom',
		'Markdown',
		'Palette',
		'Highlight'
	])
	for (const excluded of ['/admin/asset', '/admin/preview', '<img', 'Icon bitmap', '<main'])
		expect(html).not.toContain(excluded)
})

test('variant-only records have no inferred original; invalid attachment paths are not links', () => {
	const html = renderAssets(
		[
			asset('image.s.webp', 'cover/s.webp', 'cover', 'image/webp'),
			asset('attachment', '../private.pdf', 'attachment', 'application/pdf')
		],
		''
	)
	expectFileRow(table(html, 'Image'), 'cover/s.webp', 'WebP', 'image.s.webp')
	expect(elements(html, 'table')).toHaveLength(2)
	expect(html).not.toContain('Image.original')
	expect(html).not.toContain('Not recorded')
	expectUnavailableRow(table(html, 'Attachment'), '../private.pdf', 'PDF', 'attachment')
	expect(html).not.toContain('href="/pieces/assets/..')
	expect(fileLinks(html)).toHaveLength(1)
	expect(html).not.toContain('Other published files')
})

test('no records renders only a simple None recorded marker without invented tables', () => {
	const html = renderAssets([])
	expect(elements(html, 'table')).toHaveLength(0)
	expect(elements(html, 'caption')).toHaveLength(0)
	expect(elements(html, 'p')).toHaveLength(0)
	expect(html).toMatch(/<span\b[^>]*class="empty[^" ]*[^"]*"[^>]*>None recorded<\/span>/)
	expect(html.match(/None recorded/g)).toHaveLength(1)
	for (const caption of ['Attachment', 'Opengraph', 'Output', 'Images'])
		expect(html).not.toContain(`>${caption}<`)
	expect(fileLinks(html)).toHaveLength(0)
})

test.each([null, '', '../private.png', '/private.png', 'https://evil.test/file.png'])(
	'missing or unsafe PNG %s remains an actual Opengraph record without a link',
	(path) => {
		const html = renderAssets([asset('opengraph', path, 'piece', 'image/png')])
		if (path) expectUnavailableRow(table(html, 'Opengraph'), path, 'PNG', 'opengraph')
		else expectFileRow(table(html, 'Opengraph'), 'Not recorded', 'PNG', 'opengraph')
		expect(html).not.toContain('None recorded')
		expect(fileLinks(html)).toHaveLength(0)
		expect(html).not.toContain('Other published files')
	}
)

test('unknown transformation, file and raw MIME are escaped; malformed MIME displays File', () => {
	const transformation = '<script>alert(1)</script>'
	const path = '<img onerror=bad>.pdf'
	const html = renderAssets([asset(transformation, path, 'other', '<svg>')])
	expectFileRow(table(html, escapedText(transformation)), escapedText(path), 'File', transformation)
	expect(html).toContain(`aria-label="${escapedAttribute(`View ${transformation}: ${path}`)}"`)
	expect(html).toContain(`title="${escapedAttribute(path)}"`)
	expect(html).toContain('title="&lt;svg>"')
	for (const excluded of ['<script>', '<img ', '<svg>']) expect(html).not.toContain(excluded)
})

test('attachment and image variant records stay independent without invented originals', () => {
	const html = renderAssets([
		asset('attachment', 'cover.pdf', 'cover', 'application/pdf'),
		asset('image.s.webp', 'cover/s.webp', 'cover', 'image/webp')
	])
	expect(html).not.toContain('Image.original')
	expect(html).not.toContain('Not recorded')
	expectFileRow(table(html, 'Image'), 'cover/s.webp', 'WebP', 'image.s.webp')
	expectFileRow(table(html, 'Attachment'), 'cover.pdf', 'PDF', 'attachment')
})

test('image.original and deduplicated same-path attachment have independent actual captions', () => {
	const original = asset('image.original', 'shared.jpg')
	const attachment = asset('attachment', 'shared.jpg', 'cover', 'application/octet-stream')
	const html = renderAssets([attachment, original, original, attachment], '/app')
	for (const caption of ['Image', 'Attachment']) {
		const candidate = table(html, caption)
		expectFileRow(
			candidate,
			'shared.jpg',
			caption === 'Image' ? 'JPEG' : 'Binary',
			caption === 'Image' ? 'image.original' : 'attachment'
		)
		expect(fileLinks(candidate)).toHaveLength(1)
	}
	expect(html.match(/href="\/app\/pieces\/assets\/shared.jpg"/g)).toHaveLength(2)
	expect(html).not.toContain('Other published files')
	expect(rows(html).filter((row) => row[0] === 'None recorded')).toHaveLength(0)
})

test('same-basename keys retain per-key bodies in one Image family table', () => {
	const names = [
		'image.original',
		...['s', 'm', 'l', 'xl'].flatMap((size) =>
			['avif', 'webp'].map((format) => `image.${size}.${format}`)
		)
	]
	const assets = ['first', 'second'].flatMap((key) =>
		names.map((name) => {
			const format = name === 'image.original' ? 'jpeg' : name.split('.')[2]
			return asset(name, `${key}/${name}`, key, `image/${format}`)
		})
	)
	const html = renderAssets(assets)
	expect(fileLinks(html)).toHaveLength(18)
	expect(elements(html, 'caption').map(cellValue)).toEqual(['Image'])
	const bodies = elements(table(html, 'Image'), 'tbody')
	expect(bodies).toHaveLength(2)
	for (const [index, key] of ['first', 'second'].entries()) {
		const expected = names.map((name) => {
			const type = name === 'image.original' ? 'JPEG' : name.endsWith('avif') ? 'AVIF' : 'WebP'
			expectFileRow(bodies[index], `${key}/${name}`, type, name)
			return fileRow(name, `${key}/${name}`, type)
		})
		expect(rows(bodies[index])).toEqual([[`Asset ${index + 1}`], ...expected])
		expect(fileLinks(bodies[index])).toHaveLength(9)
		expect(bodies[index]).not.toContain('<table')
		expect(bodies[index]).not.toContain(`/cdn/pieces/assets/${index === 0 ? 'second' : 'first'}/`)
	}
})

test('null database content does not hide missing originals, attachments, variants or unfamiliar files', () => {
	const html = renderAssets(
		['image.original', 'attachment', 'image.s.webp', 'document.custom'].map((transformation) =>
			asset(transformation, null)
		)
	)
	expectFileRow(table(html, 'Image'), 'Not recorded', 'JPEG', 'image.original')
	// The recorded MIME, not the transformation's format, determines Type.
	expectFileRow(table(html, 'Image'), 'Not recorded', 'JPEG', 'image.s.webp')
	expectFileRow(table(html, 'Attachment'), 'Not recorded', 'JPEG', 'attachment')
	expectFileRow(table(html, 'Document'), 'Not recorded', 'JPEG', 'document.custom')
	expect(html).toContain('title="document.custom"')
	expect(rows(html).filter((row) => row[0] === 'None recorded')).toHaveLength(0)
	expect(html).not.toContain('Unavailable')
	expect(fileLinks(html)).toHaveLength(0)
})

test('unsafe paths are not archive, preview, external or guessed links; actual non-PNG Opengraph is shown', () => {
	const html = renderAssets(
		[
			asset('image.original', '../archive/cover.jpg'),
			asset('attachment', '/admin/asset/private.html', 'attachment', 'text/html'),
			asset('image.s.webp', 'https://evil.test/cover.webp', 'cover', 'image/webp'),
			asset('unknown', 'bad\\path.txt', 'other', 'text/plain'),
			asset('opengraph', 'share.jpg', 'piece', 'image/jpeg')
		],
		'https://app.test/site/'
	)
	expectUnavailableRow(table(html, 'Image'), '../archive/cover.jpg', 'JPEG', 'image.original')
	expectUnavailableRow(table(html, 'Attachment'), '/admin/asset/private.html', 'HTML', 'attachment')
	expectUnavailableRow(table(html, 'Image'), 'https://evil.test/cover.webp', 'WebP', 'image.s.webp')
	expectUnavailableRow(table(html, 'Unknown'), 'bad\\path.txt', 'Text', 'unknown')
	expect(html.match(/>Unavailable</g)).toHaveLength(4)
	expectFileRow(table(html, 'Opengraph'), 'share.jpg', 'JPEG', 'opengraph')
	expect(fileLinks(html)).toHaveLength(1)
	expect(html).not.toContain('<img')
})

test('executable attachments and escaped transform/path/MIME labels use protected public links', () => {
	const html = renderAssets(
		[
			asset('attachment', 'files/<script>"&.html', 'attachment', 'text/html'),
			asset('custom.<svg>', 'files/雪 #?%.svg', 'other', '<svg>'),
			asset('image.s.<img>', 'variants/<img>.webp', 'cover', 'image/png')
		],
		'https://app.test/site/'
	)
	const links = fileLinks(html)
	expect(links).toHaveLength(3)
	for (const link of links) expect(link).toContain('href="https://app.test/site/pieces/assets/')
	expectFileRow(table(html, 'Attachment'), 'files/&lt;script>"&amp;.html', 'HTML', 'attachment')
	expectFileRow(table(html, 'Custom'), 'files/雪 #?%.svg', 'File', 'custom.<svg>')
	expectFileRow(table(html, 'Image'), 'variants/&lt;img>.webp', 'PNG', 'image.s.<img>')
	expect(html).toContain('aria-label="View image.s.&lt;img>: variants/&lt;img>.webp"')
	expect(html).toContain('title="&lt;svg>"')
	expect(html).toContain('/files/%E9%9B%AA%20%23%3F%25.svg')
	for (const excluded of ['<script>', '<svg>', '<img>']) expect(html).not.toContain(excluded)
})

test('Opengraph links the deduplicated recorded path, not an original or reconstructed composition', () => {
	const html = renderAssets([
		asset('opengraph', 'piece/recorded.png', 'piece', 'image/png'),
		asset('opengraph', 'piece/recorded.png', 'piece', 'image/png'),
		{ ...asset('markdown', null, 'piece', 'text/plain'), content: 'PRIVATE' },
		{ ...asset('palette', null, 'piece'), content: 'PRIVATE' }
	])
	expect(fileLinks(html)).toHaveLength(1)
	const link = fileLinks(table(html, 'Opengraph'))[0]
	expect(link).toContain('href="/cdn/pieces/assets/piece/recorded.png"')
	expect(link).toContain('aria-label="View opengraph: piece/recorded.png"')
	expect(link).toContain('title="piece/recorded.png"')
	expect(link).toMatch(/>View<\/a>$/)
	expectFileRow(table(html, 'Opengraph'), 'piece/recorded.png', 'PNG', 'opengraph')
	expect(html).not.toContain('>Images<')
	expect(rows(table(html, 'Markdown'))).toContainEqual(
		valueRow('markdown', 'Content', 'text/plain', 'Show')
	)
	expect(rows(table(html, 'Palette'))).toContainEqual(
		valueRow('palette', 'Content', 'image/jpeg', 'Show')
	)
	for (const excluded of ['Attachment', 'Other published files', '<img', '<main']) {
		expect(html).not.toContain(excluded)
	}
})

test('attachment-only keys have no invented original; escaped keys stay internal', () => {
	const html = renderAssets([
		asset('attachment', 'files/one.pdf', '<svg onload=bad>', 'application/pdf'),
		asset('attachment', 'files/two.zip', 'second', 'application/zip')
	])
	expectFileRow(table(html, 'Attachment'), 'files/one.pdf', 'PDF', 'attachment')
	expectFileRow(table(html, 'Attachment'), 'files/two.zip', 'ZIP', 'attachment')
	expect(html).not.toContain('&lt;svg onload=bad>')
	expect(rows(table(html, 'Attachment'))).toEqual([
		columns,
		['Asset 1'],
		fileRow('attachment', 'files/one.pdf', 'PDF'),
		['Asset 2'],
		fileRow('attachment', 'files/two.zip', 'ZIP')
	])
	expect(html).not.toContain('<svg')
	expect(html).not.toContain('>Images<')
})

test('long Unicode paths use short View links with intact escaped metadata but no key display', () => {
	const key = `${'long-key-'.repeat(30)}雪 <key>"&`
	const path = `files/${'long-path-'.repeat(30)}雪 #?% <file>"&.pdf`
	const html = renderAssets([asset('attachment', path, key, 'application/pdf')], '/app')
	expectFileRow(table(html, 'Attachment'), escapedText(path), 'PDF', 'attachment')
	const links = fileLinks(html)
	expect(links).toHaveLength(1)
	expect(links[0]).toContain(
		`href="/app/pieces/assets/${path.split('/').map(encodeURIComponent).join('/')}"`
	)
	expect(links[0]).toContain(`aria-label="${escapedAttribute(`View attachment: ${path}`)}"`)
	expect(links[0]).toContain(`title="${escapedAttribute(path)}"`)
	expect(links[0]).toMatch(/>View<\/a>$/)
	expect(links[0]).not.toContain(`<bdi dir="ltr">${escapedText(path)}</bdi>`)
	expect(html).not.toContain(escapedAttribute(key))
	expect(html).not.toContain(escapedText(key))
	expect(elements(html, 'bdi')).toHaveLength(3)
	for (const excluded of ['<file>', '<key>', ' onclick=', ' onerror='])
		expect(html).not.toContain(excluded)
})

test('invalid recorded paths retain full LTR text and a Value-cell cue while null paths say Not recorded', () => {
	const html = renderAssets([
		asset('attachment', '../private/雪 <file>.pdf', 'unsafe', 'application/pdf'),
		asset('image.original', null, 'missing')
	])
	expectUnavailableRow(
		table(html, 'Attachment'),
		'../private/雪 &lt;file>.pdf',
		'PDF',
		'attachment'
	)
	expectFileRow(table(html, 'Image'), 'Not recorded', 'JPEG', 'image.original')
	expect(html).toContain('<bdi dir="ltr">../private/雪 &lt;file>.pdf</bdi>')
	expect(html).toContain('title="attachment: ../private/雪 &lt;file>.pdf"')
	expect(fileLinks(html)).toHaveLength(0)
})

test('SSR retains explicit table roles and aria-hidden mobile labels for every flat row', () => {
	const html = renderAssets([
		asset('image.original', 'cover.jpg'),
		asset('attachment', 'cover.pdf', 'cover', 'application/pdf'),
		asset('image.s.webp', 'cover/s.webp', 'cover', 'image/webp'),
		asset('opengraph', 'piece/share.png', 'piece', 'image/png'),
		asset('custom', 'files/other.zip', 'other', 'application/zip'),
		{ ...asset('palette', null, 'cover', 'application/json'), content: '{"color":"red"}' },
		{ ...asset('highlight', null, 'cover', 'text/html'), content: '<code>plain text</code>' }
	])
	const nativeRoles = {
		table: 'table',
		thead: 'rowgroup',
		tbody: 'rowgroup',
		tr: 'row',
		td: 'cell'
	}
	for (const [tag, role] of Object.entries(nativeRoles)) {
		const openingTags = [...html.matchAll(tagPattern)].filter((match) =>
			new RegExp(`^<${tag}\\b`).test(match[0])
		)
		expect(openingTags.length).toBeGreaterThan(0)
		for (const opening of openingTags) expect(opening[0]).toContain(`role="${role}"`)
	}
	for (const header of [...html.matchAll(tagPattern)].filter((match) => /^<th\b/.test(match[0]))) {
		expect(header[0]).toContain(
			header[0].includes('scope="col"') ? 'role="columnheader"' : 'role="rowheader"'
		)
	}
	const labelPattern = /<span\b[^>]*class="cell-label[^"]*"[^>]*>([\s\S]*?)<\/span>/g
	const labels = [...html.matchAll(labelPattern)]
	for (const label of labels) expect(label[0]).toContain('aria-hidden="true"')
	for (const [label, count] of [
		['Output', 7],
		['Field', 7],
		['Value', 7],
		['Variant', 0],
		['File', 0],
		['Type', 7]
	] as const) {
		expect(labels.filter((match) => match[1] === label)).toHaveLength(count)
	}
	for (const cell of [...elements(html, 'th'), ...elements(html, 'td')]) {
		if (cell.includes('scope="col"') || cell.includes('colspan=')) continue
		expect([...cell.matchAll(labelPattern)]).toHaveLength(1)
	}
	expect(elements(html, 'tr').filter(isSourceRow)).toHaveLength(2)
	expect(elements(renderAssets([]), 'td')).toHaveLength(0)
})

test.each([
	['image/png', 'PNG'],
	[' IMAGE/WEBP ; charset=utf-8', 'WebP'],
	['application/vnd.example+json', 'vnd.example+json'],
	['application/this-subtype-is-too-long-to-display', 'File'],
	['<svg onload="bad">', 'File'],
	['constructor', 'File'],
	['toString', 'File'],
	['__proto__', 'File'],
	['', 'File']
])(
	'Type uses recorded MIME %s, never the path extension or transformation format',
	(mime, type) => {
		const html = renderAssets([asset('image.s.avif', 'variants/file.pdf', 'cover', mime)])
		const files = table(html, 'Image')
		expectFileRow(files, 'variants/file.pdf', type, 'image.s.avif')
		expect(html).toContain(`title="${escapedAttribute(mime)}"`)
		expect(html).toContain('aria-label="View image.s.avif: variants/file.pdf"')
		expect(html).not.toContain('<svg')
	}
)

test('output/path/field start ellipsis and unified dense field padding preserve accessible heads', () => {
	// Source contract only: this does not assert browser layout or visual verification.
	const source = readFileSync(new URL('./AssetOutputs.svelte', import.meta.url), 'utf8')
	const truncation = source.match(/\.truncated\s*\{(\s*display:[^}]+)\}/)?.[1] ?? ''
	for (const rule of [
		'display: block',
		'max-width: 100%',
		'overflow: hidden',
		'text-overflow: ellipsis',
		'white-space: nowrap',
		'direction: rtl',
		'text-align: left'
	]) {
		expect(truncation).toContain(rule)
	}
	expect(source).toContain('min-width: 0')
	expect(source).toContain('table-layout: fixed')
	expect(source.match(/table\s*\{[^}]*table-layout:[^}]+\}/)?.[0]).toContain(
		'font-size: var(--font-size-xs)'
	)
	for (const selector of [/caption\s*\{([^}]+)\}/, /th,\s*td\s*\{([^}]+)\}/]) {
		expect(source.match(selector)?.[1]).toContain('padding: var(--space-2) var(--space-3)')
	}
	expect(source).not.toContain('2.5rem')
	expect(source).not.toContain('file-actions')
	const mobile = source.slice(source.indexOf('@media'))
	const row = mobile.match(/tbody > tr\s*\{([^}]+)\}/)?.[1] ?? ''
	expect(row).toContain('padding: 0')
	expect(row).toContain('border-top: 1px solid var(--color-outline-variant)')
	const fields = mobile.match(/tbody > tr > th,\s*tbody > tr > td\s*\{([^}]+)\}/)?.[1] ?? ''
	for (const rule of [
		'display: grid',
		'grid-template-columns: minmax(0, 1fr) minmax(0, 2fr)',
		'gap: var(--space-2)',
		'padding: var(--space-2) var(--space-3)',
		'border: 0'
	])
		expect(fields).toContain(rule)
	expect(fields).not.toContain('border-top:')
	expect(source.match(/\.empty\s*\{([^}]+)\}/)?.[1]).toContain('font-size: var(--font-size-xs)')
	expect(mobile).not.toContain('td.empty')
	const groupHeading = mobile.match(/tbody > tr > th\.group-heading\s*\{([^}]+)\}/)?.[1] ?? ''
	expect(groupHeading).toContain('display: block')
	expect(groupHeading).toContain('padding: var(--space-2) var(--space-3)')
	expect(mobile).not.toContain('var(--space-1)')
	expect(source).not.toContain('variant-table')
	expect(source).not.toContain('variants-row')
	const head = mobile.match(/thead\s*\{([^}]+)\}/)?.[1] ?? ''
	expect(head).toContain('position: absolute')
	expect(head).toContain('clip-path: inset(50%)')
	expect(head).not.toContain('display: none')
	expect(head).not.toContain('visibility: hidden')
})

test('all different originals remain in their key body; exact records alone are deduplicated', () => {
	const first = asset('image.original', 'first.jpg')
	const html = renderAssets([
		first,
		first,
		asset('image.original', 'second.png', 'cover', 'image/png'),
		asset('image.original', '../unsafe.svg', 'cover', 'image/svg+xml'),
		asset('image.original', null),
		asset('image.s.webp', 'small.webp', 'cover', 'image/webp')
	])
	const images = table(html, 'Image')
	expect(elements(images, 'tbody')).toHaveLength(1)
	expect(rows(elements(images, 'tbody')[0])).toHaveLength(5)
	expectFileRow(images, 'first.jpg', 'JPEG', 'image.original')
	expectFileRow(images, 'second.png', 'PNG', 'image.original')
	expectUnavailableRow(images, '../unsafe.svg', 'SVG', 'image.original')
	expectFileRow(images, 'Not recorded', 'JPEG', 'image.original')
	expectFileRow(table(html, 'Image'), 'small.webp', 'WebP', 'image.s.webp')
})

test('all actual Opengraph outputs retain grouped identity, raw Type and missing or unsafe metadata', () => {
	const html = renderAssets([
		asset('opengraph', 'share.png', 'first', 'image/png'),
		asset('opengraph', 'share.webp', 'second', 'image/webp'),
		asset('opengraph', 'share.jpg', 'third', 'image/jpeg'),
		asset('opengraph', '../unsafe.svg', 'unsafe', 'image/svg+xml'),
		asset('opengraph', null, 'missing', ''),
		asset('opengraph', 'unknown.ext', 'unknown', '<svg>')
	])
	const opengraph = table(html, 'Opengraph')
	expect(rows(opengraph)).toHaveLength(13)
	expectFileRow(opengraph, 'share.png', 'PNG', 'opengraph')
	expectFileRow(opengraph, 'share.webp', 'WebP', 'opengraph')
	expectFileRow(opengraph, 'share.jpg', 'JPEG', 'opengraph')
	expectUnavailableRow(opengraph, '../unsafe.svg', 'SVG', 'opengraph')
	expectFileRow(opengraph, 'Not recorded', 'File', 'opengraph')
	expectFileRow(opengraph, 'unknown.ext', 'File', 'opengraph')
	expect(opengraph).toContain('title="&lt;svg>"')
	expect(fileLinks(opengraph)).toHaveLength(4)
	expect(opengraph).not.toContain('None recorded')
})

test('empty inline content and embedded missing content differ from JSON null and from missing files', () => {
	const html = renderAssets([
		{ ...asset('highlight', null, 'empty', 'application/json'), content: '' },
		{ ...asset('highlight', null, 'missing', 'application/json'), is_embedded: 1 },
		{ ...asset('highlight', null, 'json-null', 'application/json'), content: 'null' },
		asset('highlight', null, 'missing-file', 'text/html')
	])
	expectFileRow(table(html, 'Highlight'), 'Not recorded', 'HTML', 'highlight')
	const values = table(html, 'Highlight')
	expect(rows(values)).toContainEqual(valueRow('highlight', 'Content', 'application/json', 'Empty'))
	expect(rows(values)).toContainEqual(
		valueRow('highlight', 'Content', 'application/json', 'Not recorded')
	)
	expect(rows(values)).toContainEqual(valueRow('highlight', 'Content', 'application/json', 'Show'))
	expectShowValue(values, 'highlight', 'null', 3)
	expect(elements(values, 'button')).toHaveLength(1)
	expect(fileLinks(html)).toHaveLength(0)
})

test('path plus inline content retains both capabilities in one family table with stable dedup', () => {
	const record = {
		...asset('markdown', 'content/page.html', 'piece', 'text/html'),
		content: '<h1>Recorded</h1>'
	}
	const html = renderAssets([
		record,
		record,
		{ ...record, content: '<h1>Different</h1>' },
		{ ...record, mime_type: 'text/plain' }
	])
	const files = table(html, 'Markdown')
	expect(elements(html, 'caption').map(cellValue)).toEqual(['Markdown'])
	expect(rows(files)).toHaveLength(7)
	expectFileRow(files, 'content/page.html', 'HTML', 'markdown')
	expectFileRow(files, 'content/page.html', 'Text', 'markdown')
	expect(rows(files)).toEqual([
		columns,
		fileRow('markdown', 'content/page.html', 'HTML'),
		fileRow('markdown', 'content/page.html', 'HTML'),
		fileRow('markdown', 'content/page.html', 'Text'),
		valueRow('markdown', 'Content', 'text/html', 'Show'),
		valueRow('markdown', 'Content', 'text/html', 'Show'),
		valueRow('markdown', 'Content', 'text/plain', 'Show')
	])
	expect(
		elements(files, 'button').map((button) => button.match(/aria-label="([^"]*)"/)?.[1])
	).toEqual([
		'Show Markdown: Asset 1, Content',
		'Show Markdown: Asset 1, Content',
		'Show Markdown: Asset 1, Content'
	])
	expect(files).not.toContain('Different')
	expect(fileLinks(files)).toHaveLength(3)
	expect(files).not.toContain('<h1>')
})

test('captions use generic family first-caps while Output preserves producer identity without generic Other sections', () => {
	const names = [
		'attachment',
		'opengraph',
		'palette',
		'markdown',
		'markdown.description',
		'highlight',
		'custom.Name',
		'constructor',
		'__proto__'
	]
	const html = renderAssets(
		names.flatMap((name) => [
			asset(name, `${name}.txt`, 'one', 'text/plain'),
			asset(name, `${name}-two.txt`, 'two', 'text/plain')
		])
	)
	expect(elements(html, 'caption').map(cellValue)).toEqual([
		'Attachment',
		'Opengraph',
		'Palette',
		'Markdown',
		'Highlight',
		'Custom',
		'Constructor',
		'__proto__'
	])
	for (const candidate of elements(html, 'table'))
		expect(rows(candidate)).toHaveLength(
			cellValue(elements(candidate, 'caption')[0]) === 'Markdown' ? 7 : 5
		)
	for (const name of names)
		expectFileRow(table(html, transformCaption(transformFamily(name))), `${name}.txt`, 'Text', name)
	expect(html).not.toContain('Other published files')
})

test.each([
	[
		'markdown',
		'text/html',
		'<script>alert(1)</script><img src=x onerror=alert(1)><iframe src="javascript:alert(1)"></iframe>'
	],
	[
		'highlight',
		'text/html',
		'<svg onload="alert(1)"><foreignObject><style>*{display:none}</style></foreignObject></svg>'
	],
	['markdown.description', 'text/plain', 'javascript:alert(1) data:text/html,<script>bad</script>'],
	['custom', 'text/css', 'body{background:url(javascript:alert(1));} @import "https://evil.test";'],
	[
		'palette',
		'application/json',
		'{"<svg onload=bad>":"<script>bad</script>","style":"background:url(javascript:bad)"}'
	]
])(
	'untrusted %s values stay absent while collapsed, never active markup, CSS or links',
	(name, mime, content) => {
		const html = renderAssets([{ ...asset(name, null, 'unsafe', mime), content }])
		const caption = transformCaption(transformFamily(name))
		const values = table(html, caption)
		expect(rows(values)).toContainEqual(valueRow(name, 'Content', mime, 'Show'))
		expectShowValue(values, name, content)
		for (const tag of ['script', 'img', 'iframe', 'svg', 'style', 'input', 'textarea'])
			expect(html).not.toMatch(new RegExp(`<${tag}\\b`, 'i'))
		expect(html).not.toMatch(/<(?:[^>"']|"[^"]*"|'[^']*')*\s(?:style|onload|onerror)=/i)
		expect(fileLinks(values)).toHaveLength(0)
	}
)

test('huge Unicode JSON becomes Show without DOM payload or exposing metadata field names', () => {
	const key = `${'key'.repeat(80)}雪 <key>"&`
	const field = `${'field'.repeat(80)}雪 <field>"&`
	const value = `  ${'雪😀<script>raw</script> &\n'.repeat(4000)}  `
	const html = renderAssets([
		{
			...asset('palette', null, key, 'application/json'),
			content: JSON.stringify({ [field]: value })
		}
	])
	const palette = table(html, 'Palette')
	expect(elements(palette, 'button')).toHaveLength(1)
	expect(palette).toContain(`aria-label="${escapedAttribute(`Show Palette: Asset 1, Content`)}"`)
	expect(palette).not.toContain(escapedText(value))
	expect(palette).not.toContain('raw&lt;/script>')
	expect(html.length).toBeLessThan(12000)
	const projected = groupAssets(
		[
			{
				...asset('palette', null, key, 'application/json'),
				content: JSON.stringify({ [field]: value })
			}
		],
		'/cdn'
	)
	expect(projected.transforms[0].values[0].value).toBe(JSON.stringify({ [field]: value }))
	expect(palette).not.toContain(escapedText(key))
	expect(palette).not.toContain(escapedAttribute(key))
	expect(palette).not.toContain(escapedText(field))
	expect(palette).not.toContain(escapedAttribute(field))
})

test('Markdown huge source, short JSON and plain content all use Show without SSR payload', () => {
	const source = `  ${'雪😀<script>bad()</script><img onerror=bad> &\n'.repeat(4000)}  `
	const html = renderAssets([
		asset('attachment', 'other.pdf', 'first', 'application/pdf'),
		{ ...asset('markdown', null, 'private-key', 'text/html; charset=utf-8'), content: source },
		{
			...asset('markdown.description', null, 'third', 'application/json'),
			content: JSON.stringify({ description: '<b>雪 & raw</b>', count: 42 })
		},
		{ ...asset('markdown.description', null, 'private-key', 'text/plain'), content: 'different' }
	])
	const description = table(html, 'Markdown')
	expect(elements(html, 'caption').map(cellValue)).toEqual(['Attachment', 'Markdown'])
	expect(rows(description)).toEqual([
		columns,
		['Asset 2'],
		valueRow('markdown', 'Content', 'text/html; charset=utf-8', 'Show'),
		valueRow('markdown.description', 'Content', 'text/plain', 'Show'),
		['Asset 3'],
		valueRow('markdown.description', 'Content', 'application/json', 'Show')
	])
	const buttons = elements(html, 'button')
	expectShowValue(
		description,
		'markdown.description',
		JSON.stringify({ description: '<b>雪 & raw</b>', count: 42 }),
		3
	)
	expect(buttons).toHaveLength(3)
	expect(buttons.map((button) => button.match(/aria-label="([^"]*)"/)?.[1])).toEqual([
		'Show Markdown: Asset 2, Content',
		'Show Markdown.description: Asset 2, Content',
		'Show Markdown.description: Asset 3, Content'
	])
	for (const button of buttons) {
		expect(button).toContain('type="button"')
		expect(button).toMatch(/>Show<\/button>$/)
		expect(button).not.toContain('disabled')
	}
	expect(html).not.toContain('aria-live=')
	expect(html.length).toBeLessThan(12000)
	for (const excluded of ['data-', 'private-key', 'bad()', '&lt;script>', '<script', '<img'])
		expect(html).not.toContain(excluded)
	expectFileRow(table(html, 'Attachment'), 'other.pdf', 'PDF', 'attachment')
	expect(fileLinks(html)).toHaveLength(1)
})

test('Markdown null and empty have no controls; actual root-relative files retain only View', () => {
	const html = renderAssets([
		{ ...asset('markdown', null, 'null', 'text/html'), is_embedded: 1 },
		{ ...asset('markdown', null, 'empty', 'text/html'), content: '' },
		asset('markdown', 'actual/page.html', 'file', 'text/html'),
		{ ...asset('markdown.description', null, 'null', 'text/plain'), is_embedded: 1 },
		{ ...asset('markdown.description', null, 'empty', 'text/plain'), content: '' }
	])
	expectFileRow(table(html, 'Markdown'), 'actual/page.html', 'HTML', 'markdown')
	const values = table(html, 'Markdown')
	expect(elements(html, 'caption').map(cellValue)).toEqual(['Markdown'])
	for (const output of ['markdown', 'markdown.description']) {
		const mime = output === 'markdown' ? 'text/html' : 'text/plain'
		expect(rows(values)).toContainEqual(valueRow(output, 'Content', mime, 'Not recorded'))
		expect(rows(values)).toContainEqual(valueRow(output, 'Content', mime, 'Empty'))
	}
	expect(elements(values, 'button')).toHaveLength(0)
	expect(fileLinks(html)).toHaveLength(1)
})

test('worker-shaped palette retains one whole value without field or color projection', () => {
	const record = {
		...asset('palette', null, 'cover', 'application/json; charset=utf-8'),
		content: JSON.stringify({
			background: '#123456',
			bodyText: '#fff',
			titleText: '#000F',
			accent: '#ABCDEF',
			muted: '#12345678',
			swatches: ['#abc', 'red; background:url(javascript:bad)', '<script>bad()</script>'],
			nested: { color: '#fff', values: [['#abc']] },
			empty: [],
			missing: null,
			blank: '',
			active: false,
			count: 0
		})
	}
	const palette = table(renderAssets([record]), 'Palette')
	expect(rows(palette)).toEqual([columns, valueRow('palette', 'Content', record.mime_type, 'Show')])
	expectShowValue(palette, 'palette', record.content)
	expect(groupAssets([record], '/cdn').transforms[0].values).toEqual([
		{
			key: 'cover',
			output: 'palette',
			field: 'Content',
			value: record.content,
			mime: record.mime_type
		}
	])
	expect(palette).toContain('title="application/json; charset=utf-8"')
	expect(fileLinks(palette)).toHaveLength(0)
	expect(palette).not.toContain('Not recorded')
})

test('parent owns identity-keyed disclosure state and lazily delegates only opened source', () => {
	// Source contract only: Node SSR cannot click or run the client effect.
	const source = readFileSync(new URL('./AssetOutputs.svelte', import.meta.url), 'utf8')
	expect(source).toContain("import { transformCaption, fileType } from './presentation'")
	expect(source).toContain("import { toggleDisclosure } from './disclosure'")
	expect(source).toContain('let expanded = $state.raw<Set<OutputValue>>(new Set())')
	expect(source).toContain('expanded = toggleDisclosure(expanded, value)')
	const effect = source.match(/\$effect\(\(\) => \{([\s\S]*?)\}\)/)?.[1] ?? ''
	expect(effect).toContain('void grouped')
	expect(effect).toContain('expanded = new Set<OutputValue>()')
	expect(effect).not.toContain('expanded.')
	expect(effect).not.toContain('toggleDisclosure')
	expect(source).toContain('{#each group.items as row, rowIndex (row)}')
	expect(source).toContain('groupByKey<OutputRow>([...transform.files, ...transform.values])')
	expect(source).toContain('`${titleId}-source-${familyIndex}-${groupIndex}-${rowIndex}`')
	expect(source).toContain('`${transformCaption(output)}: ${assetLabel(group.key)}, ${field}`')
	expect(source).toContain('onclick={() => toggle(row)}')
	expect(source).toMatch(
		/\{#if expanded.has\(row\)\}\s*<SourceContent value=\{row\} label=\{context\} \/>\s*\{\/if\}/
	)
	expect(source).toContain('hidden={!expanded.has(row)}')
	for (const forbidden of [
		'AssetValue',
		'CopyValue',
		'copyText',
		'copyFeedback',
		'fileActions',
		'download',
		'valuePresentation',
		'initialExpanded',
		'style:',
		'<pre',
		'<code',
		'{@html',
		'fetch(',
		'Blob',
		'navigator',
		'window',
		'image/jpeg',
		'text/html',
		'application/json',
		"'palette'",
		"'markdown'",
		"'image.original'",
		'preview=',
		'published='
	])
		expect(source).not.toContain(forbidden)
})

// The parent does not parse or format source; detailed syntax/limit tests live in source suites.
test.each([
	['text/plain', '  雪 & <b>literal</b>\n\tsecond line  '],
	[' TEXT/HTML ; charset=UTF-8', '<h1>雪 & raw</h1>'],
	['text/css', 'body { background: url(javascript:bad); }'],
	['application/javascript', 'alert("raw")'],
	['application/xml', '<root>raw</root>'],
	['image/svg+xml', '<svg onload="bad()"/>'],
	['text/x-python', 'print("raw")'],
	['text/markdown', '# Recorded source'],
	['text/json', '{broken'],
	['application/problem+json', 'null'],
	[' TEXT/Custom+JSON ; charset=utf-8 ', '{ "id":9007199254740993,"same":1,"same":2 }'],
	['invalid', ' \r\n ']
])('nonempty %s content uses contextual Show without SSR payload', (mime, content) => {
	const output = 'custom.source<output>"&'
	const values = table(
		renderAssets([{ ...asset(output, null, 'private-key', mime), content }]),
		'Custom'
	)
	expect(rows(values)).toEqual([columns, valueRow(output, 'Content', mime, 'Show')])
	expectShowValue(values, output, content)
	expect(values).toContain(`title="${escapedAttribute(mime)}"`)
	expect(allLinks(values)).toHaveLength(0)
	expect(values).not.toMatch(/<(?:script|style|svg|h1|output)\b/)
	expect(values).not.toContain('private-key')
})

test.each(['/app', '', 'https://app.test/site/', '//cdn.test/prefix/'])(
	'file actions for base %s retain actual View URLs and never offer Download',
	(base) => {
		const path = 'files/雪 #?% <file>"&.html'
		const html = renderAssets(
			[
				asset('image.original', 'original.jpg'),
				asset('image.s.webp', 'variants/s.webp', 'cover', 'image/webp'),
				asset('attachment', path, 'one', 'text/html'),
				asset('opengraph', 'actual/share.webp', 'piece', 'image/webp'),
				asset('renamed', 'custom.bin', 'other', 'application/octet-stream'),
				asset('unsafe', '../private.html', 'unsafe', 'text/html'),
				asset('missing', null, 'missing', 'text/plain')
			],
			base
		)
		expect(fileLinks(html)).toHaveLength(5)
		expect(allLinks(html)).toHaveLength(5)
		const prefix = base.replace(/\/$/, '')
		const recordedPaths = [
			'original.jpg',
			'variants/s.webp',
			path,
			'actual/share.webp',
			'custom.bin'
		]
		const expectedHrefs = recordedPaths.map(
			(recordedPath) =>
				`${prefix}/pieces/assets/${recordedPath.split('/').map(encodeURIComponent).join('/')}`
		)
		expect(fileLinks(html).map((link) => link.match(/\bhref="([^"]*)"/)![1])).toEqual(expectedHrefs)
		const href = `${prefix}/pieces/assets/${path.split('/').map(encodeURIComponent).join('/')}`
		const files = table(html, 'Attachment')
		expect(fileLinks(files)[0]).toContain(`href="${href}"`)
		expect(allLinks(table(html, 'Unsafe'))).toHaveLength(0)
		expect(allLinks(table(html, 'Missing'))).toHaveLength(0)
	}
)

test.each([
	'palette',
	'image.original',
	'image.s.webp',
	'palette.renamed',
	'image.renamed',
	'markdown-renamed',
	'Markdown',
	'custom.<svg>',
	'constructor',
	'__proto__'
])('%s retains native View and whole inline values independently of producer identity', (name) => {
	const path = 'files/雪 #? <actual>.bin'
	const key = 'raw-private-key'
	for (const [mime, content, marker] of [
		['text/plain', '#AbC', 'Show'],
		['image/png', 'BASE64', 'Show'],
		['application/json', '{ "__proto__":"own","same":1,"same":2,"escaped":"\\u96ea" }', 'Show'],
		['text/html', '', 'Empty'],
		['text/html', null, 'Not recorded']
	] as const) {
		const record = {
			...asset(name, path, key, mime),
			content: content ?? undefined,
			is_embedded: 1 as const
		}
		const html = renderAssets([record, record], '/app')
		const caption = escapedText(transformCaption(transformFamily(name)))
		const outputs = table(html, caption)
		expect(elements(html, 'caption').map(cellValue)).toEqual([caption])
		expect(rows(outputs)).toEqual([
			columns,
			fileRow(name, escapedText(path), fileType(mime)),
			valueRow(name, 'Content', mime, marker)
		])
		// Count all links independently: an extra action must not hide behind a View filter.
		expect(allLinks(outputs)).toHaveLength(1)
		expect(fileLinks(outputs)).toHaveLength(1)
		const view = fileLinks(outputs)[0]
		expect(view).toContain('href="/app/pieces/assets/files/%E9%9B%AA%20%23%3F%20%3Cactual%3E.bin"')
		expect(view).toContain(`aria-label="${escapedAttribute(`View ${name}: ${path}`)}"`)
		expect(view).toContain(`title="${escapedAttribute(path)}"`)
		expect(outputs).toContain(`title="${escapedAttribute(mime)}"`)
		expect(elements(outputs, 'button')).toHaveLength(marker === 'Show' ? 1 : 0)
		if (marker === 'Show') expectShowValue(outputs, name, content!)
		expect(groupAssets([record, record], '/app').transforms[0].values).toEqual([
			{ key, output: name, field: 'Content', value: content, mime }
		])
		expect(html).not.toContain(key)
		for (const tag of ['img', 'svg', 'style', 'script', 'iframe'])
			expect(html).not.toMatch(new RegExp(`<${tag}\\b`, 'i'))
	}
})

test.each(['image.original', 'image.s.webp', 'palette', 'renamed'])(
	'actual %s records retain MIME, content and embedding differences; only exact repeats disappear',
	(name) => {
		const first = { ...asset(name, 'same/path.bin', 'first', 'text/plain'), content: '#abc' }
		const secondKey = { ...first, asset_key: 'second' }
		const html = renderAssets([
			first,
			first,
			{ ...first, content: '#fff' },
			{ ...first, mime_type: 'image/png' },
			{ ...first, is_embedded: 1 },
			secondKey,
			secondKey
		])
		const caption = transformCaption(transformFamily(name))
		const files = table(html, caption)
		expect(fileLinks(files)).toHaveLength(5)
		expect(elements(files, 'tbody')).toHaveLength(2)
		expect(elements(html, 'caption').map(cellValue)).toEqual([caption])
		expect(rows(elements(files, 'tbody')[0])).toEqual([
			['Asset 1'],
			fileRow(name, 'same/path.bin', 'Text'),
			fileRow(name, 'same/path.bin', 'Text'),
			fileRow(name, 'same/path.bin', 'PNG'),
			fileRow(name, 'same/path.bin', 'Text'),
			valueRow(name, 'Content', 'text/plain', 'Show'),
			valueRow(name, 'Content', 'text/plain', 'Show'),
			valueRow(name, 'Content', 'image/png', 'Show'),
			valueRow(name, 'Content', 'text/plain', 'Show')
		])
		expect(rows(elements(files, 'tbody')[1])).toEqual([
			['Asset 2'],
			fileRow(name, 'same/path.bin', 'Text'),
			valueRow(name, 'Content', 'text/plain', 'Show')
		])
		expect(elements(files, 'button')).toHaveLength(5)
		expect(html).not.toContain('style=')
	}
)

test('one Image family table retains file and inline capabilities for every full output', () => {
	const original = asset('image.original', 'same/file.bin', 'cover', 'image/jpeg')
	const variant = asset('image.s.webp', 'same/file.bin', 'cover', 'image/webp')
	const note = {
		...asset('image.note', 'notes.txt', 'cover', 'text/plain'),
		content: 'actual inline note'
	}
	const html = renderAssets([original, variant, original, note, note])
	expect(elements(html, 'caption').map(cellValue)).toEqual(['Image'])
	const images = table(html, 'Image')
	expect(rows(images)).toEqual([
		columns,
		fileRow('image.original', 'same/file.bin', 'JPEG'),
		fileRow('image.s.webp', 'same/file.bin', 'WebP'),
		fileRow('image.note', 'notes.txt', 'Text'),
		valueRow('image.note', 'Content', 'text/plain', 'Show')
	])
	expect(fileLinks(images)).toHaveLength(3)
	expect(elements(images, 'tbody')).toHaveLength(1)
	expect(elements(images, 'tr').filter(isSourceRow)).toHaveLength(1)
	expectShowValue(images, 'image.note', 'actual inline note')
	for (const output of ['image.original', 'image.s.webp', 'image.note']) {
		expect(images).toContain(`title="${output}"`)
		expect(images).toContain(`<bdi dir="ltr">${output}</bdi>`)
	}
})

test('Markdown file, note and schema outputs share a table but keep distinct Show context', () => {
	const html = renderAssets([
		asset('markdown', 'page.html', 'piece', 'text/html'),
		{ ...asset('markdown.description', null, 'piece', 'text/html'), content: '<p>private A</p>' },
		{ ...asset('markdown.note', null, 'piece', 'text/html'), content: '<p>private B</p>' },
		{
			...asset('markdown.schema', null, 'piece', 'application/json'),
			content: '{"description":"short text","count":2}'
		}
	])
	expect(elements(html, 'caption').map(cellValue)).toEqual(['Markdown'])
	const markdown = table(html, 'Markdown')
	expect(rows(markdown)).toEqual([
		columns,
		fileRow('markdown', 'page.html', 'HTML'),
		valueRow('markdown.description', 'Content', 'text/html', 'Show'),
		valueRow('markdown.note', 'Content', 'text/html', 'Show'),
		valueRow('markdown.schema', 'Content', 'application/json', 'Show')
	])
	expect(
		elements(markdown, 'button').map((button) => button.match(/aria-label="([^"]*)"/)![1])
	).toEqual([
		'Show Markdown.description: Asset 1, Content',
		'Show Markdown.note: Asset 1, Content',
		'Show Markdown.schema: Asset 1, Content'
	])
	expectShowValue(markdown, 'markdown.schema', '{"description":"short text","count":2}')
	expect(fileLinks(markdown)).toHaveLength(1)
	expect(markdown).not.toContain('private A')
	expect(markdown).not.toContain('private B')
})

test('unfamiliar namespace collisions retain full outputs and whole own-key JSON records', () => {
	const content = '{"__proto__":"own","constructor":"also own","color":"#AbC"}'
	const first = { ...asset('custom.FIRST', 'same.json', 'one', 'application/json'), content }
	const second = { ...first, transformation: 'custom.Second' }
	const html = renderAssets([first, second, first, second])
	expect(elements(html, 'caption').map(cellValue)).toEqual(['Custom'])
	const custom = table(html, 'Custom')
	expect(rows(custom)).toEqual([
		columns,
		fileRow('custom.FIRST', 'same.json', 'JSON'),
		fileRow('custom.Second', 'same.json', 'JSON'),
		...['custom.FIRST', 'custom.Second'].map((output) =>
			valueRow(output, 'Content', 'application/json', 'Show')
		)
	])
	expect(fileLinks(custom)).toHaveLength(2)
	for (const output of ['custom.FIRST', 'custom.Second']) {
		expect(custom).toContain(`title="${output}"`)
		expectShowValue(custom, output, content)
	}
	expect(elements(custom, 'button')).toHaveLength(2)
})

test('combined file-only and inline-only keys share family bodies with root-order aliases', () => {
	const html = renderAssets([
		asset('attachment', 'first.pdf', 'root-first', 'application/pdf'),
		{ ...asset('custom.note', null, 'inline-second', 'text/plain'), content: 'inline only' },
		asset('custom.file', 'third.txt', 'file-third', 'text/plain'),
		{ ...asset('custom.missing', null, 'embedded-fourth', 'text/plain'), is_embedded: 1 }
	])
	expect(elements(html, 'caption').map(cellValue)).toEqual(['Attachment', 'Custom'])
	const custom = table(html, 'Custom')
	expect(rows(custom)).toEqual([
		columns,
		['Asset 2'],
		valueRow('custom.note', 'Content', 'text/plain', 'Show'),
		['Asset 3'],
		fileRow('custom.file', 'third.txt', 'Text'),
		['Asset 4'],
		valueRow('custom.missing', 'Content', 'text/plain', 'Not recorded')
	])
	expect(elements(custom, 'tbody')).toHaveLength(3)
	for (const body of elements(custom, 'tbody')) {
		const heading = elements(body, 'th')[0]
		expect(heading).toContain('scope="rowgroup"')
		expect(heading).toContain('colspan="4"')
	}
	expectShowValue(custom, 'custom.note', 'inline only', 2)
	expect(fileLinks(custom)).toHaveLength(1)
	for (const key of ['root-first', 'inline-second', 'file-third', 'embedded-fourth'])
		expect(html).not.toContain(key)
})

test('same displayed family caption does not merge case-distinct namespaces or raw output labels', () => {
	const output = `Custom.${'long-output-'.repeat(30)}雪 <output>"&`
	const html = renderAssets([
		{ ...asset('custom.note', null, 'one', 'text/plain'), content: 'lower namespace' },
		{ ...asset(output, null, 'one', 'text/plain'), content: 'upper namespace' }
	])
	expect(elements(html, 'caption').map(cellValue)).toEqual(['Custom', 'Custom'])
	const tables = elements(html, 'table')
	expect(rows(tables[0])).toEqual([
		columns,
		valueRow('custom.note', 'Content', 'text/plain', 'Show')
	])
	expect(rows(tables[1])).toEqual([columns, valueRow(output, 'Content', 'text/plain', 'Show')])
	const header = elements(elements(tables[1], 'tbody')[0], 'th')[0]
	expect(header).toContain('scope="row"')
	expect(header).toContain(`title="${escapedAttribute(output)}"`)
	expect(header).toContain(`<bdi dir="ltr">${escapedText(output)}</bdi>`)
	expectShowValue(tables[1], output, 'upper namespace')
	expect(html).not.toContain('<output>')
})

test.each([undefined, 'Published assets', 'Preview outputs', '<private heading> & "text"'])(
	'heading %j labels only its own section without exposing record keys',
	(heading) => {
		const html = render(AssetOutputs, {
			props: {
				assets: [asset('custom.file', 'file.txt', 'secret-key', 'text/plain')],
				fileUrl: () => undefined,
				...(heading === undefined ? {} : { heading })
			}
		}).body.replace(/<!--[\s\S]*?-->/g, '')
		const section = elements(html, 'section')[0]
		const title = elements(section, 'h2')[0]
		const titleId = title.match(/\bid="([^"]+)"/)?.[1]
		expect(titleId).toBeDefined()
		expect(titleId).not.toBe('published-assets-title')
		expect(section.match(/\baria-labelledby="([^"]+)"/)?.[1]).toBe(titleId)
		expect(cellValue(title)).toBe(escapedText(heading ?? 'Outputs'))
		expect(html.match(new RegExp(`id="${titleId}"`, 'g'))).toHaveLength(1)
		expect(html).not.toContain('secret-key')
		if (heading === undefined) {
			expect(html).not.toContain('Published')
			expect(html).not.toContain('Preview')
		}
	}
)

test('section title IDs come from Svelte instance IDs, not headings or record keys', () => {
	const source = readFileSync(new URL('./AssetOutputs.svelte', import.meta.url), 'utf8')
	expect(source).toContain('const titleId = $props.id()')
	expect(source).toContain('<section aria-labelledby={titleId}>')
	expect(source).toContain('<h2 id={titleId}>{heading}</h2>')
	expect(source).not.toContain('published-assets-title')
})

test('generic preview-shaped callback URLs retain only native View, full outputs and inline family rows', () => {
	const path = 'files/源 #?%/file%20name.json'
	const url =
		'/admin/piece/book/preview/job-id/assets/files/%E6%BA%90%20%23%3F%25/file%2520name.json'
	const record = {
		...asset('custom.full.output', path, 'secret-key', 'application/json'),
		content: '{"__proto__":"own","value":"#abc"}'
	}
	const fileUrl = vi.fn((rawPath: string) => (rawPath === path ? url : undefined))
	const html = render(AssetOutputs, {
		props: {
			assets: [
				record,
				record,
				{ ...asset('custom.note', null, 'secret-key', 'text/plain'), content: 'inline only' }
			],
			fileUrl,
			heading: 'Preview outputs'
		}
	}).body.replace(/<!--[\s\S]*?-->/g, '')
	const custom = table(html, 'Custom')
	expectFileViews(html)
	expect(fileUrl).toHaveBeenCalledExactlyOnceWith(path)
	expect(elements(html, 'h2').map(cellValue)).toEqual(['Preview outputs'])
	expect(elements(html, 'caption').map(cellValue)).toEqual(['Custom'])
	expect(rows(custom)).toEqual([
		columns,
		fileRow('custom.full.output', path, 'JSON'),
		valueRow('custom.full.output', 'Content', 'application/json', 'Show'),
		valueRow('custom.note', 'Content', 'text/plain', 'Show')
	])
	expectShowValue(custom, 'custom.full.output', record.content)
	expect(fileLinks(custom)).toHaveLength(1)
	expect(allLinks(custom)).toHaveLength(1)
	expectDisclosureRows(html, [
		record,
		record,
		{ ...asset('custom.note', null, 'secret-key', 'text/plain'), content: 'inline only' }
	])
	const view = fileLinks(custom)[0]
	for (const link of [view]) {
		expect(link).toContain(`href="${url}"`)
		expect(link).toContain(`title="${escapedAttribute(path)}"`)
		expect(link).toContain('rel="noopener noreferrer"')
	}
	expect(view).toContain(`aria-label="${escapedAttribute(`View custom.full.output: ${path}`)}"`)
	expect(view).toContain('target="_blank"')
	expect(view).not.toMatch(/\sdownload(?:\s|=|>)/)
	expect(html).not.toContain('secret-key')
	expect(html).not.toContain('/pieces/assets/')
})

test('invalid and callback-unavailable files stay visible alongside embedded values without bogus links', () => {
	const fileUrl = vi.fn((_path: string) => undefined)
	const html = render(AssetOutputs, {
		props: {
			assets: [
				asset('custom.unsafe', '../bad.txt', 'secret-key', 'text/plain'),
				{
					...asset('custom.file', 'valid.txt', 'secret-key', 'text/plain'),
					content: 'inline value'
				},
				asset('custom.missing', null, 'secret-key', 'text/plain'),
				{ ...asset('custom.embedded', null, 'secret-key', 'text/plain'), is_embedded: 1 as const }
			],
			fileUrl
		}
	}).body.replace(/<!--[\s\S]*?-->/g, '')
	const custom = table(html, 'Custom')
	expectFileViews(html)
	expect(fileUrl).toHaveBeenCalledExactlyOnceWith('valid.txt')
	expectUnavailableRow(custom, '../bad.txt', 'Text', 'custom.unsafe')
	expectUnavailableRow(custom, 'valid.txt', 'Text', 'custom.file')
	expect(rows(custom)).toContainEqual(valueRow('custom.file', 'Content', 'text/plain', 'Show'))
	expect(rows(custom)).toContainEqual(fileRow('custom.missing', 'Not recorded', 'Text'))
	expect(rows(custom)).toContainEqual(
		valueRow('custom.embedded', 'Content', 'text/plain', 'Not recorded')
	)
	expect(fileLinks(custom)).toHaveLength(0)
	expect(allLinks(custom)).toHaveLength(0)
	expect(html).not.toContain('No usable published link')
	expect(html).not.toContain('secret-key')
})

test('detail rows are native full-width siblings only for nonempty inline values', () => {
	const html = renderAssets([
		asset('custom.file', 'actual.txt', 'same-key', 'text/plain'),
		{ ...asset('custom.empty', null, 'same-key', 'text/plain'), content: '' },
		{ ...asset('custom.missing', null, 'same-key', 'text/plain'), is_embedded: 1 },
		{ ...asset('custom.note', null, 'same-key', 'text/plain'), content: 'raw private note' },
		{ ...asset('custom.json', null, 'same-key', 'application/json'), content: '{ "raw": 1 }' }
	])
	const custom = table(html, 'Custom')
	// Count ALL native rows before checking the metadata projection.
	expect(elements(custom, 'tr')).toHaveLength(8) // header + 5 metadata + 2 detail
	expect(elements(custom, 'tr').filter(isSourceRow)).toHaveLength(2)
	expect(rows(custom)).toHaveLength(6)
	expect(elements(custom, 'td')).toHaveLength(17) // 5 * 3 metadata + 2 colspan cells
	expect(elements(custom, 'button').map(cellValue)).toEqual(['Show', 'Show'])
	expectShowValue(custom, 'custom.note', 'raw private note')
	expectShowValue(custom, 'custom.json', '{ "raw": 1 }')
	expect(elements(custom, 'table')).toHaveLength(1)
})

test('disclosure IDs use instance and family/group/row ordinals even for equal labels and values', () => {
	const first = {
		...asset('custom.same', 'first.txt', 'private-key-first', 'text/plain'),
		content: 'private repeated bytes'
	}
	const html = renderAssets([
		first,
		first, // Exact full records still deduplicate.
		{ ...first, mime_type: 'image/png' },
		{ ...first, asset_key: 'private-key-second' },
		{ ...first, transformation: 'other.same' }
	])
	const instanceId = elements(html, 'h2')[0].match(/\bid="([^"]+)"/)![1]
	const ids = elements(html, 'tr')
		.filter(isSourceRow)
		.map((row) => row.match(/\bid="([^"]+)"/)![1])
	expect(ids).toEqual([
		`${instanceId}-source-0-0-2`,
		`${instanceId}-source-0-0-3`,
		`${instanceId}-source-0-1-1`,
		`${instanceId}-source-1-0-1`
	])
	expect(
		elements(html, 'button').map((button) => button.match(/aria-controls="([^"]+)"/)![1])
	).toEqual(ids)
	expect(html).not.toContain('private-key-first')
	expect(html).not.toContain('private-key-second')
	expect(html).not.toContain('private repeated bytes')
	// All rows, including two group headings and four detail rows, remain visible to this count.
	expect(elements(html, 'tr')).toHaveLength(16) // 2 headers + 2 group headings + 8 metadata + 4 detail
})

test('mobile source cells override the label grid and collapsed rows override mobile display', () => {
	// CSS/source contract only; this does not claim browser layout or focus verification.
	const source = readFileSync(new URL('./AssetOutputs.svelte', import.meta.url), 'utf8')
	const mobile = source.slice(source.indexOf('@media'))
	const cell = mobile.match(/tbody > tr > td\.source-cell\s*\{([^}]+)\}/)?.[1] ?? ''
	for (const rule of ['display: block', 'width: 100%', 'padding: var(--space-2) var(--space-3)'])
		expect(cell).toContain(rule)
	for (const forbidden of [
		'grid-template-columns',
		'margin',
		'padding-left',
		'padding-inline-start'
	])
		expect(cell).not.toContain(forbidden)
	expect(mobile.indexOf('td.source-cell')).toBeGreaterThan(mobile.indexOf('tbody > tr > td {'))
	expect(source.match(/\[hidden\]\s*\{([^}]+)\}/)?.[1]).toContain('display: none !important')
	const button = source.match(/\n\tbutton\s*\{([^}]+)\}/)?.[1] ?? ''
	for (const rule of [
		'font: inherit',
		'font-weight: var(--font-weight-normal)',
		'var(--color-primary)',
		'var(--color-surface-container)'
	])
		expect(button).toContain(rule)
	expect(source).toContain('button:focus-visible')
	expect(source).toContain("expanded.has(row) ? 'Hide' : 'Show'")
	expect(source).not.toContain('svelte-ignore')
})
