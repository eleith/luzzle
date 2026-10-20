import { loadTemplateBundle } from '$lib/server/templates.js'

const fallback = { state: 'fallback', body: '<p>Built-in presentation</p>', head: '' }

export async function load({ url }) {
	try {
		const bundle = await loadTemplateBundle(process.env.TEMPLATE_PREPARED_DIR)
		if (!bundle) return fallback
		const type = url.searchParams.get('type') ?? 'custom-kind'
		const name = bundle.templateLookup.pieces[type]?.page
		if (!name) return fallback
		const output = bundle.render(name, {
			data: { piece: { title: url.searchParams.get('title') ?? 'Prepared title' } }
		})
		return {
			state: bundle.revision,
			body: output.body,
			head: `${output.head}<style data-prepared-theme>${bundle.themeCss}</style>`
		}
	} catch (error) {
		console.error(error)
		return fallback
	}
}
