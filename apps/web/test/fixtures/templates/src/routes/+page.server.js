import { loadTemplateBundle } from '$lib/server/templates.js'
import { renderTemplatePage } from '$lib/server/template-page.js'
import { createTemplateHelpers } from '$lib/server/template-helpers.js'
import { assetPathToUrl } from '$lib/pieces/assets.js'
import { previewOutputUrl } from '$lib/pieces/preview/output-url.js'

const fallback = {
	state: 'fallback',
	body: '<p>Built-in presentation</p>',
	head: '',
	navigation: undefined
}

export async function load({ url }) {
	try {
		const bundle = await loadTemplateBundle(process.env.TEMPLATE_PREPARED_DIR)
		if (!bundle) return fallback
		const type = url.searchParams.get('type') ?? 'custom-kind'
		const role = url.searchParams.get('role') === 'opengraph' ? 'opengraph' : 'page'
		const name = bundle.templateLookup.pieces[type]?.[role]
		if (!name) return fallback
		const origin = url.origin
		const job = url.searchParams.get('job')
		const noteContent = job === null ? '<p>Published note</p>' : '<p>Draft note</p>'
		const piece = {
			id: 'fixture-piece',
			key: 'fixture-key',
			type,
			slug: 'prepared piece',
			title: url.searchParams.get('title') ?? 'Prepared title',
			date_added: 1,
			metadata: { cover: 'cover' },
			keywords: '[]',
			assets: [
				{
					asset_key: 'cover',
					transformation: 'image.s.jpg',
					asset_path: 'fixture/cover small.jpg',
					mime_type: 'image/jpeg'
				},
				{
					asset_key: 'cover',
					transformation: 'palette',
					content: '{"accent":"#123456"}',
					mime_type: 'application/json'
				},
				{
					asset_key: 'fixture-key',
					transformation: 'markdown',
					content: noteContent,
					mime_type: 'text/html'
				}
			]
		}
		const urls = {
			buildPieceUrl: (piece) =>
				`${origin}/pieces/${encodeURIComponent(piece.type)}/${encodeURIComponent(piece.slug)}`,
			buildAssetUrl: (path) =>
				job === null ? assetPathToUrl(path, origin) : previewOutputUrl(path, job),
			buildStaticAssetUrl: (path) =>
				path === 'images/mark.svg' ? `${origin}/site-assets/images/mark.svg` : undefined
		}
		let output
		if (role === 'page') {
			output = renderTemplatePage(bundle, name, { piece, tags: [] }, urls)
		} else {
			const rendered = bundle.render(name, {
				data: { piece },
				options: { size: { width: 1200, height: 630 } },
				helpers: createTemplateHelpers(urls)
			})
			output = { ...rendered, navigation: undefined }
		}
		return {
			state: bundle.revision,
			body: output.body,
			navigation: output.navigation,
			head: `${output.head}<style data-prepared-theme>${bundle.themeCss}</style>`
		}
	} catch (error) {
		console.error(error)
		return fallback
	}
}
