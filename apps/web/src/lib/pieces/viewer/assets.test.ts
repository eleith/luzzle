import { expect, test, vi } from 'vitest'
import { groupAssetOutputs } from './assets'
import { assetPathToUrl } from '#lib/pieces/assets.js'
import { asset } from './fixtures/published'

function groupAssets(assets: Parameters<typeof groupAssetOutputs>[0], base: string) {
	return groupAssetOutputs(assets, (path) => assetPathToUrl(path, base))
}

function transform(records: Parameters<typeof groupAssetOutputs>[0], name: string, base = '') {
	const section = groupAssets(records, base).transforms.find((section) => section.name === name)
	expect(section).toBeDefined()
	return section!
}

test('groups every producer uniformly while retaining keys, originals, variants and attachments as recorded', () => {
	const original = asset('image.original', 'first/cover.jpg', 'first')
	const records = [
		asset('attachment', 'first/cover.jpg', 'first'),
		original,
		original,
		asset('image.s.webp', 'first/s.webp', 'first', 'image/webp'),
		asset('image.s.webp', 'first/s.webp', 'first', 'image/webp'),
		asset('image.original', 'second/cover.jpg', 'second')
	]
	const before = structuredClone(records)
	const data = groupAssets(records, 'https://cdn.example/prefix/')
	expect(records).toEqual(before)
	expect(data.transforms.map((section) => section.name)).toEqual(['attachment', 'image'])
	expect(transform(records, 'image').files).toMatchObject([
		{ key: 'first', path: 'first/cover.jpg', label: 'image.original', mime: 'image/jpeg' },
		{ key: 'first', path: 'first/s.webp', label: 'image.s.webp', mime: 'image/webp' },
		{ key: 'second', path: 'second/cover.jpg', label: 'image.original', mime: 'image/jpeg' }
	])
	expect(transform(records, 'image', 'https://cdn.example/prefix/').files[2].url).toBe(
		'https://cdn.example/prefix/pieces/assets/second/cover.jpg'
	)
	expect(transform(records, 'image').files).toHaveLength(3)
	expect(transform(records, 'attachment').files).toMatchObject([
		{ key: 'first', path: 'first/cover.jpg' }
	])
	expect(data).not.toHaveProperty('images')
})

test('renamed jobs retain actual file and value outputs in generic producer sections', () => {
	const records = [
		asset('pictures.original', 'published/cover.jpg', 'cover'),
		asset('pictures.s.webp', 'published/s.webp', 'cover', 'image/webp'),
		{ ...asset('rendered-note', null, 'piece', 'text/html'), content: '<h1>Serving HTML</h1>' },
		{
			...asset('colors.v2', null, 'piece', 'application/json'),
			content: '{"background":"#123456"}'
		},
		{ ...asset('new-job', 'published/body.html', 'piece', 'text/html'), content: '<b>both</b>' }
	]
	const before = structuredClone(records)
	const data = groupAssets(records, '/cdn')
	expect(records).toEqual(before)
	expect(data).not.toHaveProperty('images')
	expect(data.transforms.map((section) => section.name)).toEqual([
		'pictures',
		'rendered-note',
		'colors',
		'new-job'
	])
	expect(data.transforms[0].files[0]).toMatchObject({
		path: 'published/cover.jpg',
		label: 'pictures.original',
		url: '/cdn/pieces/assets/published/cover.jpg',
		mime: 'image/jpeg'
	})
	expect(data.transforms[0].files[1]).toMatchObject({
		label: 'pictures.s.webp',
		mime: 'image/webp',
		url: '/cdn/pieces/assets/published/s.webp'
	})
	expect(data.transforms[1].values[0].value).toBe('<h1>Serving HTML</h1>')
	expect(data.transforms[2].values).toEqual([
		{
			key: 'piece',
			output: 'colors.v2',
			field: 'Content',
			value: records[3].content,
			mime: 'application/json'
		}
	])
	expect(data.transforms[3].files[0].url).toBe('/cdn/pieces/assets/published/body.html')
	expect(data.transforms[3].values[0]).toMatchObject({ output: 'new-job', value: '<b>both</b>' })
})

test('deduplicates exact projected records, retaining different keys, transforms, MIME and inline values', () => {
	const records = [
		asset('image.s.webp', 'shared.webp', 'first'),
		asset('image.s.webp', 'shared.webp', 'first'),
		asset('image.m.webp', 'shared.webp', 'first'),
		asset('image.s.webp', 'another.webp', 'first'),
		asset('image.s.webp', 'shared.webp', 'second'),
		asset('custom', 'export.pdf'),
		asset('custom', 'export.pdf'),
		asset('custom', 'export.pdf', 'cover', 'application/pdf'),
		asset('custom.other', 'export.pdf'),
		{ ...asset('text', null, 'piece', 'text/plain'), content: 'one' },
		{ ...asset('text', null, 'piece', 'text/plain'), content: 'one' },
		{ ...asset('text', null, 'piece', 'text/plain'), content: 'two' }
	]
	const data = groupAssets(records, '')
	expect(
		transform(records, 'image').files.map((file) => [file.key, file.label, file.path])
	).toEqual([
		['first', 'image.s.webp', 'shared.webp'],
		['first', 'image.m.webp', 'shared.webp'],
		['first', 'image.s.webp', 'another.webp'],
		['second', 'image.s.webp', 'shared.webp']
	])
	expect(
		data.transforms.map((section) => [section.name, section.files.length, section.values.length])
	).toEqual([
		['image', 4, 0],
		['custom', 3, 0],
		['text', 0, 2]
	])
})

test.each(['image.original', 'attachment'])(
	'%s retains every distinct missing/usable path without replacing a record',
	(name) => {
		const records = [
			asset(name, null),
			asset(name, 'valid.jpg'),
			asset(name, 'also-valid.jpg'),
			asset(name, 'valid.jpg')
		]
		const data = groupAssets(records, '')
		const files = data.transforms[0].files
		expect(files.map((file) => file.path)).toEqual([null, 'valid.jpg', 'also-valid.jpg'])
		expect(files[0].url).toBeUndefined()
	}
)

test('absent originals remain absent while all size/format variants remain associated with their key', () => {
	const variants = ['s', 'm', 'l', 'xl'].flatMap((size) =>
		['avif', 'webp'].map((format) => asset(`image.${size}.${format}`, `cover/${size}.${format}`))
	)
	const data = groupAssets(variants, '/garden')
	expect(data.transforms.map((section) => section.name)).toEqual(['image'])
	expect(data.transforms[0].files).toHaveLength(8)
	expect(data.transforms[0].files.map((file) => file.label)).toEqual(
		variants.map((record) => record.transformation)
	)
	expect(data.transforms[0].files.some((file) => file.label === 'image.original')).toBe(false)
	expect(data.transforms[0].files[7].url).toBe('/garden/pieces/assets/cover/xl.webp')
	expect(data.transforms[0].files.every((file) => file.key === 'cover')).toBe(true)
})

test('groups all actual downstream transforms including content, unknown outputs and file-plus-inline content', () => {
	const records = [
		asset('opengraph', 'piece/share.png', 'piece', 'image/png'),
		{
			...asset('palette', null, 'piece', 'application/json'),
			content: '{"background":"#123456","accent":"#abcdef"}'
		},
		{ ...asset('markdown', null, 'piece', 'text/html'), content: '<h1>inline</h1>' },
		{ ...asset('markdown.description', null, 'piece', 'text/html'), content: '' },
		{ ...asset('highlight', null), is_embedded: 1 as const },
		asset('document.custom', 'piece/export.pdf', 'piece', 'application/pdf'),
		asset('image.custom', 'piece/custom.jpg', 'piece'),
		{ ...asset('markdown', 'piece/body.html', 'piece', 'text/html'), content: 'inline' }
	]
	const data = groupAssets(records, '/cdn')
	expect(data).not.toHaveProperty('images')
	expect(data.transforms.map((section) => section.name)).toEqual([
		'opengraph',
		'palette',
		'markdown',
		'highlight',
		'document',
		'image'
	])
	expect(transform(records, 'palette').values).toEqual([
		{
			key: 'piece',
			output: 'palette',
			field: 'Content',
			value: records[1].content,
			mime: 'application/json'
		}
	])
	expect(transform(records, 'markdown').values.map((row) => row.value)).toEqual([
		'<h1>inline</h1>',
		'',
		'inline'
	])
	expect(transform(records, 'markdown', '/cdn').files[0].url).toBe(
		'/cdn/pieces/assets/piece/body.html'
	)
	expect(transform(records, 'highlight').values[0].value).toBeNull()
	expect(transform(records, 'markdown').values[1]).toMatchObject({
		output: 'markdown.description',
		value: ''
	})
})

test('retains every actual Opengraph output, not just the first usable PNG', () => {
	const section = transform(
		[
			asset('opengraph', '../bad.png', 'piece', 'image/png'),
			asset('opengraph', 'share.jpg', 'piece', 'image/jpeg'),
			asset('opengraph', 'valid.png', 'piece', 'image/png'),
			asset('opengraph', 'valid.png', 'piece', 'image/png'),
			asset('opengraph', 'second.png', 'piece', 'image/png')
		],
		'opengraph'
	)
	expect(section.files.map((file) => file.path)).toEqual([
		'../bad.png',
		'share.jpg',
		'valid.png',
		'second.png'
	])
	expect(section.files[0].url).toBeUndefined()
	expect(section.files[1].mime).toBe('image/jpeg')
})

test.each(['image/jpeg', 'application/octet-stream', 'text/html'])(
	'Opengraph MIME %s is inspectable as recorded, never reclassified by extension',
	(mime) => {
		const file = transform([asset('opengraph', 'share.png', 'piece', mime)], 'opengraph').files[0]
		expect(file).toMatchObject({ mime, path: 'share.png', url: '/pieces/assets/share.png' })
	}
)

test.each(['image.original', 'attachment', 'image.s.webp', 'document.custom'])(
	'%s with neither content nor path remains a missing file record',
	(name) => {
		const data = groupAssets([asset(name, null)], '')
		const files = data.transforms.flatMap((section) => section.files)
		expect(files).toHaveLength(1)
		expect(files[0]).toMatchObject({ path: null, url: undefined })
	}
)

test('family grouping preserves full output identities, fields, MIME and every file-plus-inline capability', () => {
	const records = [
		{
			...asset('custom.a', 'same/file.json', 'one', 'application/json'),
			content: '{"first":"value","second":42}'
		},
		{ ...asset('custom.b', 'same/file.json', 'one', 'text/plain'), content: 'raw' },
		{ ...asset('custom', null, 'two', 'text/plain'), is_embedded: 1 as const },
		{ ...asset('other.a', 'same/file.json', 'one', 'text/plain'), content: 'raw' }
	]
	const before = structuredClone(records)
	const grouped = groupAssets([...records, ...records], '/cdn')
	expect(records).toEqual(before)
	expect(grouped.transforms.map((group) => group.name)).toEqual(['custom', 'other'])
	expect(grouped.transforms[0].files.map((file) => [file.label, file.mime, file.path])).toEqual([
		['custom.a', 'application/json', 'same/file.json'],
		['custom.b', 'text/plain', 'same/file.json']
	])
	expect(
		grouped.transforms[0].values.map((value) => [value.output, value.field, value.value, value.key])
	).toEqual([
		['custom.a', 'Content', records[0].content, 'one'],
		['custom.b', 'Content', 'raw', 'one'],
		['custom', 'Content', null, 'two']
	])
	expect(grouped.transforms[1].files[0].label).toBe('other.a')
	expect(grouped.transforms[1].values[0].output).toBe('other.a')
})

test('family grouping uses exact prefixes, first-seen order and Map-safe names rather than a known-producer registry', () => {
	const names = [
		'custom.more',
		'imagewriter.s.webp',
		'custom',
		'image.original',
		'Image.original',
		'__proto__.one',
		'__proto__.two',
		'.leading'
	]
	const result = groupAssets(
		names.map((name) => asset(name, 'file.bin')),
		''
	)
	expect(result.transforms.map((group) => group.name)).toEqual([
		'custom',
		'imagewriter',
		'image',
		'Image',
		'__proto__',
		'.leading'
	])
	expect(result.transforms[0].files.map((file) => file.label)).toEqual(['custom.more', 'custom'])
	expect(result.transforms[4].files.map((file) => file.label)).toEqual([
		'__proto__.one',
		'__proto__.two'
	])
	expect(result.transforms.flatMap((group) => group.files)).toHaveLength(names.length)
})

test('empty input invents no downstream transform sections', () => {
	expect(groupAssets([], '')).toEqual({ transforms: [] })
})

// Projection is lossless, not a JSON parser or formatter. Exercise distinct raw-data
// risks once, with MIME variations, rather than repeating syntax classes per producer.
test.each([
	['application/json', '{}'],
	['text/json', '[]'],
	['application/example+json', 'null'],
	[' APPLICATION/JSON ; charset=utf-8', '{broken'],
	['text/plain', '{"html":"<script>alert(1)</script>"}'],
	['text/html', '  <h1>raw</h1>\r\n'],
	['image/svg+xml', '{"color":"#abc"}'],
	['application/json', ''],
	[
		'application/json',
		' \r\n { "__proto__":{"polluted":true}, "constructor":"own", "same":1, "same":2, "escaped":"\\u96ea\\n" } \r\n'
	],
	['application/json', '"\\u0041\\t\\n"'],
	['application/json', '{"id":9007199254740993,"nested":{"value":1e400}}'],
	['application/json', '['.repeat(12000) + '0' + ']'.repeat(12000)]
])(
	'%s retains exactly one whole Content value with original bytes and metadata',
	(mime, content) => {
		const record = { ...asset('custom.raw', null, 'piece', mime), content }
		const before = structuredClone(record)
		const section = transform([record, record], 'custom')
		expect(record).toEqual(before)
		expect(section.files).toEqual([])
		expect(section.values).toEqual([
			{ key: 'piece', output: 'custom.raw', field: 'Content', value: content, mime }
		])
	}
)

test('inline images are inspectable values and path-plus-content images retain both views', () => {
	const data = groupAssets(
		[
			{ ...asset('image.original', null, 'embedded'), is_embedded: 1, content: 'BASE64' },
			{ ...asset('image.s.webp', 's.webp', 'cover'), content: 'DATA' }
		],
		''
	)
	expect(data).not.toHaveProperty('images')
	expect(data.transforms.map((section) => [section.name, section.files.length])).toEqual([
		['image', 1]
	])
	expect(data.transforms[0].values.map((value) => [value.output, value.value])).toEqual([
		['image.original', 'BASE64'],
		['image.s.webp', 'DATA']
	])
})

test.each(['https://cdn.test/prefix/', 'https://app.test/site/', '/prefix/', ''])(
	'base %s preserves prefixes and encodes raw paths once',
	(base) => {
		expect(
			transform([asset('attachment', 'files/源 #?%.pdf')], 'attachment', base).files[0].url
		).toBe(`${base.replace(/\/+$/, '')}/pieces/assets/files/%E6%BA%90%20%23%3F%25.pdf`)
	}
)

test('percent-looking filenames are literal paths, not decoded traversal or pre-encoded URLs', () => {
	expect(
		transform([asset('attachment', '%2e%2e/file%20name.pdf')], 'attachment', '/cdn').files[0].url
	).toBe('/cdn/pieces/assets/%252e%252e/file%2520name.pdf')
})

test('absolute public base preserves prefix but excludes query and fragment', () => {
	expect(
		transform([asset('attachment', 'file.pdf')], 'attachment', 'https://app.test/site/?q=1#hash')
			.files[0].url
	).toBe('https://app.test/site/pieces/assets/file.pdf')
})

test.each([
	null,
	undefined,
	'',
	'   ',
	'../private.png',
	'piece/../private.png',
	'/absolute.png',
	'//cdn/file.png',
	'piece//share.png',
	'piece/./share.png',
	'https://evil.test/share.png',
	'javascript:alert(1)',
	'x\\share.png'
])(
	'invalid path %j stays inspectable for every producer without invoking the URL callback',
	(path) => {
		for (const [output, family] of [
			['opengraph', 'opengraph'],
			['image.original', 'image'],
			['attachment', 'attachment'],
			['custom.file', 'custom']
		]) {
			const record = { ...asset(output, null, 'private-key', 'text/plain'), asset_path: path }
			const fileUrl = vi.fn(() => '/must-not-be-used')
			const data = groupAssetOutputs([record, record], fileUrl)
			expect(fileUrl).not.toHaveBeenCalled()
			expect(data).toEqual({
				transforms: [
					{
						name: family,
						files: [
							{
								key: 'private-key',
								path: path || null,
								label: output,
								mime: 'text/plain',
								url: undefined
							}
						],
						values: []
					}
				]
			})
		}
	}
)

test('the URL callback receives each deduplicated raw record path once, never an encoded path', () => {
	const path = 'files/源 #?%/%2e%2e/file%20name.json'
	const record = {
		...asset('unknown.full.output', path, 'private-key', 'application/json'),
		content: '{"__proto__":"own","number":42}'
	}
	const fileUrl = vi.fn((rawPath: string) =>
		rawPath === path ? '/admin/piece/book/preview/job/assets/output.json' : undefined
	)
	const data = groupAssetOutputs([record, record], fileUrl)
	expect(fileUrl).toHaveBeenCalledExactlyOnceWith(path)
	expect(data).toEqual({
		transforms: [
			{
				name: 'unknown',
				files: [
					{
						key: 'private-key',
						path,
						label: 'unknown.full.output',
						mime: 'application/json',
						url: '/admin/piece/book/preview/job/assets/output.json'
					}
				],
				values: [
					{
						key: 'private-key',
						output: 'unknown.full.output',
						field: 'Content',
						value: record.content,
						mime: 'application/json'
					}
				]
			}
		]
	})
})

test('inline-only and embedded-only outputs never ask for file URLs or invent file rows', () => {
	const records = [
		{ ...asset('custom.note', null, 'first', 'text/plain'), content: 'inline' },
		{ ...asset('custom.empty', '', 'first', 'text/plain'), content: '' },
		{ ...asset('custom.embedded', null, 'second', 'text/plain'), is_embedded: 1 as const },
		{
			...asset('custom.json', null, 'second', 'application/json'),
			content: '{"own":"value"}',
			is_embedded: 1 as const
		}
	]
	const fileUrl = vi.fn(() => '/bogus-file')
	const data = groupAssetOutputs(records, fileUrl)
	expect(fileUrl).not.toHaveBeenCalled()
	expect(data.transforms).toHaveLength(1)
	expect(data.transforms[0].files).toEqual([])
	expect(
		data.transforms[0].values.map(({ output, field, value }) => [output, field, value])
	).toEqual([
		['custom.note', 'Content', 'inline'],
		['custom.empty', 'Content', ''],
		['custom.embedded', 'Content', null],
		['custom.json', 'Content', records[3].content]
	])
})

test('a valid path with no callback URL retains both its file and inline inspection data', () => {
	const path = 'files/recorded.txt'
	const fileUrl = vi.fn((_path: string) => undefined)
	const data = groupAssetOutputs(
		[{ ...asset('custom.full', path, 'private-key', 'text/plain'), content: 'inline' }],
		fileUrl
	)
	expect(fileUrl).toHaveBeenCalledExactlyOnceWith(path)
	expect(data.transforms[0].files).toEqual([
		{ key: 'private-key', path, label: 'custom.full', mime: 'text/plain', url: undefined }
	])
	expect(data.transforms[0].values).toEqual([
		{
			key: 'private-key',
			output: 'custom.full',
			field: 'Content',
			value: 'inline',
			mime: 'text/plain'
		}
	])
})

test('dedup identity preserves delimiter-looking records and missing, empty and literal null content', () => {
	const records = [
		{ ...asset('custom.a:b', null, 'key', 'application/json'), is_embedded: 1 as const },
		{
			...asset('custom.a:b', null, 'key', 'application/json'),
			is_embedded: 1 as const,
			content: ''
		},
		{
			...asset('custom.a:b', null, 'key', 'application/json'),
			is_embedded: 1 as const,
			content: 'null'
		},
		{ ...asset('custom.a:b', null, 'key', 'application/json'), content: 'null' },
		{ ...asset('custom.a', null, 'key', 'b:application/json'), content: 'null' },
		{ ...asset('custom.a:b', null, 'key:', 'application/json'), content: 'null' },
		{ ...asset('custom.a:b', null, 'key', 'application/json'), content: 'null ' }
	]
	const fileUrl = vi.fn(() => '/not-a-file')
	const before = structuredClone(records)
	const data = groupAssetOutputs([...records, ...records], fileUrl)
	expect(records).toEqual(before)
	expect(fileUrl).not.toHaveBeenCalled()
	expect(data.transforms).toEqual([
		{
			name: 'custom',
			files: [],
			values: records.map((record) => ({
				key: record.asset_key,
				output: record.transformation,
				field: 'Content',
				value: record.content ?? null,
				mime: record.mime_type
			}))
		}
	])
})
