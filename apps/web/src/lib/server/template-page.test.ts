import { describe, expect, test } from 'vitest'
import type { TemplateBundleModule } from '@luzzle/web.templates/bundle'
import type { PageTemplateHelpers } from '@luzzle/web.templates/helpers'
import { renderTemplatePage } from './template-page.js'

const urls = {
	buildPieceUrl: () => '/piece',
	buildAssetUrl: () => undefined,
	buildStaticAssetUrl: (path: string) => `/static/${path}`
}

function page(render: (helpers: PageTemplateHelpers) => void): TemplateBundleModule {
	return {
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
	test('preserves body and head and omits navigation unless requested', () => {
		const result = renderTemplatePage(
			page(() => {}),
			'page',
			{},
			urls
		)
		expect(result).toEqual({
			body: '<main>Page</main>',
			head: '<title>Page</title>',
			navBanner: null
		})
	})

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

	test('passes the requested data to the renderer without any component constructors', () => {
		const data = { piece: { title: 'Example' } }
		const bundle = page(() => {})
		bundle.render = (_name, props) => {
			expect(props).toHaveProperty('data', data)
			expect(props).not.toHaveProperty('components')
			return { body: '', head: '' }
		}
		renderTemplatePage(bundle, 'page', data, urls)
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

	test('lets genuine rendering failures reach the caller without leaking partial presentation', () => {
		const failure = new Error('failed after requesting navigation')
		const bundle = page((helpers) => {
			helpers.showNavBanner()
			throw failure
		})
		expect(() => renderTemplatePage(bundle, 'page', {}, urls)).toThrow(failure)
		expect(
			renderTemplatePage(
				page(() => {}),
				'page',
				{},
				urls
			).navBanner
		).toBeNull()
	})
})
