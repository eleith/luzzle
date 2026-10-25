import { error } from '@sveltejs/kit'
import { loadConfig } from '@luzzle/web.templates/config'
import { mapPieceTemplates } from '@luzzle/web.templates/pieces/fields'

export async function load({ url }) {
	const role = url.searchParams.get('role') ?? 'page'
	if (!['page', 'icon', 'opengraph'].includes(role)) error(400, 'Unsupported stock template role')
	const config = loadConfig('./config.yaml')
	const type = url.searchParams.get('type') ?? 'custom-kind'
	const job = url.searchParams.get('job')
	const origin = url.origin
	const piece = mapPieceTemplates(
		{
			id: 'fixture-piece',
			key: 'fixture-key',
			type,
			slug: 'catalog piece',
			title: url.searchParams.get('title') ?? 'Catalog title',
			date_added: 1,
			note: 'Raw note',
			summary: 'Fixture description',
			metadata: {
				cover: 'cover',
				artwork: 'cover',
				scenery: 'backdrop',
				released: '2001-09-09',
				minutes: 123,
				filmmaker: 'Ada Example',
				pageCount: 320,
				bookYear: 2001,
				wordCount: 750,
				seconds: 125,
				platform: 'Console',
				files: [{ key: 'code-source', kind: 'snippet', language: 'javascript' }],
				materials: [{ label: 'Flour', amount: '1/2', measure: 'cup' }],
				directions: [{ content: '<em>Mix ingredients</em>' }],
				prepMinutes: 2,
				cookMinutes: 10,
				category: 'Fixture category',
				website: url.searchParams.get('external') ?? 'https://example.com/fixture',
				isbn: '9780000000001',
				creators: [{ name: 'Ada Example' }]
			},
			keywords: '[]',
			assets: [
				{
					asset_key: 'code-source',
					transformation: 'highlight',
					content: '<pre data-code>let value = 1;</pre>',
					mime_type: 'text/html'
				},
				{
					asset_key: 'cover',
					transformation: 'image.s.jpg',
					asset_path: 'fixture/cover small.jpg',
					mime_type: 'image/jpeg'
				},
				{
					asset_key: 'cover',
					transformation: 'image.m.jpg',
					asset_path: 'fixture/cover card.jpg',
					mime_type: 'image/jpeg'
				},
				{
					asset_key: 'cover',
					transformation: 'image.l.jpg',
					asset_path: 'fixture/cover medium.jpg',
					mime_type: 'image/jpeg'
				},
				{
					asset_key: 'backdrop',
					transformation: 'image.l.jpg',
					asset_path: 'fixture/backdrop large.jpg',
					mime_type: 'image/jpeg'
				},
				{
					asset_key: 'backdrop',
					transformation: 'image.xl.jpg',
					asset_path: 'fixture/backdrop large.jpg',
					mime_type: 'image/jpeg'
				},
				{
					asset_key: 'cover',
					transformation: 'palette',
					content: '{"accent":"#123456","background":"#234567","bodyText":"#eeeeee"}',
					mime_type: 'application/json'
				},
				{
					asset_key: 'fixture-key',
					transformation: 'markdown',
					content: job === null ? '<p>Published note</p>' : '<p>Draft note</p>',
					mime_type: 'text/html'
				}
			]
		},
		config.pieces.find((entry) => entry.type === type)
	)
	return {
		role,
		piece,
		tags: [{ slug: 'fixture-tag', tag: 'Fixture Tag' }],
		preview: job !== null,
		job,
		pieceTypes: config.pieces.map((entry) => entry.type),
		config: {
			content: { text: { title: 'Fixture garden', description: '' } },
			url: { app: origin, luzzle_assets: '' }
		}
	}
}
