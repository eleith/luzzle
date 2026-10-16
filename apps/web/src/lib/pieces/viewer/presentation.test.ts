import { expect, test } from 'vitest'
import { fileType, transformCaption, transformFamily } from './presentation'

test.each([
	['image', 'image'],
	['image.original', 'image'],
	['image.s.webp', 'image'],
	['markdown.description.nested', 'markdown'],
	['pictures.original', 'pictures'],
	['colors.v2', 'colors'],
	['custom.output', 'custom'],
	['imagewriter.s.webp', 'imagewriter'],
	['Image.original', 'Image'],
	['__proto__.output', '__proto__'],
	['constructor.output', 'constructor'],
	['image..webp', 'image'],
	['image.', 'image'],
	['.leading', '.leading'],
	['.', '.'],
	['', ''],
	['no-dot', 'no-dot']
])('output %s uses only its namespace prefix to group into family %s', (name, family) => {
	expect(transformFamily(name)).toBe(family)
})

test.each([
	['attachment', 'Attachment'],
	['opengraph', 'Opengraph'],
	['palette', 'Palette'],
	['rendered-markdown.note', 'Rendered-markdown.note'],
	['pictures.original', 'Pictures.original'],
	['image..webp', 'Image..webp'],
	['Image.original', 'Image.original'],
	['colors.v2', 'Colors.v2'],
	['toString', 'ToString'],
	['__proto__', '__proto__'],
	['', '']
])('caption %s preserves the actual name with generic capitalization', (name, expected) => {
	expect(transformCaption(name)).toBe(expected)
})

test.each([
	['image/jpeg', 'JPEG'],
	['image/png', 'PNG'],
	['image/webp', 'WebP'],
	['image/avif', 'AVIF'],
	['image/svg+xml', 'SVG'],
	['application/pdf', 'PDF'],
	['application/zip', 'ZIP'],
	['text/html', 'HTML'],
	['application/json', 'JSON'],
	['text/plain', 'Text'],
	['text/markdown', 'Markdown'],
	['application/octet-stream', 'Binary'],
	[' TEXT/HTML; charset=utf-8 ', 'HTML'],
	['application/future+json', 'future+json'],
	['image/unknown', 'unknown'],
	['<svg>', 'File'],
	['text/bad subtype', 'File'],
	['application/' + 'x'.repeat(25), 'File'],
	['__proto__', 'File'],
	['constructor', 'File'],
	['toString', 'File'],
	['', 'File']
])('recorded MIME %s supplies a label or conservative File fallback', (mime, expected) => {
	expect(fileType(mime)).toBe(expected)
})

test('absent MIME has the same File fallback', () => {
	expect(fileType()).toBe('File')
})
