import { describe, expect, test } from 'vitest'
import type { LoadedTemplateBundle } from './templates.js'
import type { PageTemplateHelpers } from '@luzzle/web.templates/helpers'
import { renderTemplatePage } from './template-page.js'

const urls = {
	buildPieceUrl: () => '/piece',
	buildAssetUrl: () => undefined,
	buildStaticAssetUrl: (path: string) => `/static/${path}`
}

function page(
	render: (helpers: PageTemplateHelpers) => void,
	revision = 'first'
): LoadedTemplateBundle {
	return {
		revision,
		themeCss: `/* theme ${revision} */`,
		templateLookup: { pieces: {}, site: { root: 'page' } },
		render(name, props) {
			expect(name).toBe('page')
			const { helpers } = props as { helpers: PageTemplateHelpers }
			render(helpers)
			return { body: '<main>Page</main>', head: '<title>Page</title>' }
		}
	}
}

describe('renderTemplatePage', () => {
	test.each(['first', 'second'])(
		'returns only serializable presentation with the matching %s revision and theme',
		(revision) => {
			const result = renderTemplatePage(
				page(() => {}, revision),
				'page',
				{},
				urls
			)
			expect(result).toEqual({
				revision,
				body: '<main>Page</main>',
				head: `<title>Page</title><style data-prepared-theme>/* theme ${revision} */</style>`,
				navBanner: null
			})
			expect(JSON.parse(JSON.stringify(result))).toEqual(result)
			expect(Object.keys(result).sort()).toEqual(['body', 'head', 'navBanner', 'revision'])
		}
	)

	test('requests the real banner with its existing defaults when called without colors', () => {
		const result = renderTemplatePage(
			page((helpers) => helpers.showNavBanner()),
			'page',
			{},
			urls
		)
		expect(result.navBanner).toEqual({})
	})

	test('snapshots only the three color inputs and preserves other helpers', () => {
		const colors = {
			background: 'var(--color-primary)',
			color: 'var(--color-on-primary)',
			hoverColor: 'var(--color-secondary)',
			showHome: false,
			showRandom: true
		}
		const result = renderTemplatePage(
			page((helpers) => {
				expect(helpers.getStaticAssetUrl('mark.svg')).toBe('/static/mark.svg')
				helpers.showNavBanner(colors)
				colors.background = 'changed after capture'
			}),
			'page',
			{},
			urls
		)
		expect(result.navBanner).toEqual({
			background: 'var(--color-primary)',
			color: 'var(--color-on-primary)',
			hoverColor: 'var(--color-secondary)'
		})
	})

	test('the last call replaces the color overrides but still requests only one banner', () => {
		const result = renderTemplatePage(
			page((helpers) => {
				helpers.showNavBanner({ background: 'var(--color-primary)' })
				helpers.showNavBanner({ color: 'var(--color-on-surface)', hoverColor: undefined })
			}),
			'page',
			{},
			urls
		)
		expect(result.navBanner).toEqual({ color: 'var(--color-on-surface)' })
	})

	test('passes a new deep copy of serving data on every render without component constructors', () => {
		const data = { piece: { title: 'Example', metadata: { cover: 'cover' } }, tags: ['tag'] }
		const copies: object[] = []
		const bundle = page(() => {})
		bundle.render = (_name, props) => {
			const input = props as { data: typeof data }
			expect(input.data).toEqual(data)
			expect(input.data).not.toBe(data)
			expect(input.data.piece).not.toBe(data.piece)
			expect(input.data.piece.metadata).not.toBe(data.piece.metadata)
			expect(input.data.tags).not.toBe(data.tags)
			expect(Object.keys(props).sort()).toEqual(['data', 'helpers'])
			copies.push(input.data)
			return { body: '', head: '' }
		}
		renderTemplatePage(bundle, 'page', data, urls)
		renderTemplatePage(bundle, 'page', data, urls)
		expect(copies[0]).not.toBe(copies[1])
	})

	test('a successful template cannot mutate serving data', () => {
		const data = { piece: { title: 'Example', metadata: { cover: 'cover' } }, tags: ['tag'] }
		const before = structuredClone(data)
		const bundle = page(() => {})
		bundle.render = (_name, props) => {
			const input = props as { data: typeof data }
			input.data.piece.title = 'Changed'
			input.data.piece.metadata.cover = 'Changed'
			input.data.tags.length = 0
			return { body: '<main>Changed</main>', head: '' }
		}
		expect(renderTemplatePage(bundle, 'page', data, urls).body).toBe('<main>Changed</main>')
		expect(data).toEqual(before)
	})

	test('keeps render state isolated across requests, including calls on the same bundle', () => {
		let show = true
		const bundle = page((helpers) => {
			if (show) helpers.showNavBanner({ background: 'var(--color-primary)' })
		})
		const first = renderTemplatePage(bundle, 'page', {}, urls)
		show = false
		const second = renderTemplatePage(bundle, 'page', {}, urls)
		expect(first.navBanner).toEqual({ background: 'var(--color-primary)' })
		expect(second.navBanner).toBeNull()
	})

	test('a throwing template cannot mutate serving data or leak partial presentation', () => {
		const data = { piece: { title: 'Example' }, tags: ['tag'] }
		const before = structuredClone(data)
		const failure = new Error('failed after requesting navigation')
		const bundle = page(() => {})
		bundle.render = (_name, props) => {
			const input = props as { data: typeof data; helpers: PageTemplateHelpers }
			input.helpers.showNavBanner()
			input.data.piece.title = 'Changed'
			input.data.tags.length = 0
			throw failure
		}
		let result
		expect(() => {
			result = renderTemplatePage(bundle, 'page', data, urls)
		}).toThrow(failure)
		expect(result).toBeUndefined()
		expect(data).toEqual(before)
		bundle.render = () => ({ body: 'Recovered', head: '' })
		expect(renderTemplatePage(bundle, 'page', data, urls)).toEqual({
			revision: 'first',
			body: 'Recovered',
			head: '<style data-prepared-theme>/* theme first */</style>',
			navBanner: null
		})
	})
})
