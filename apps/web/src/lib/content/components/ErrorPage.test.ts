import { render } from 'svelte/server'
import { expect, test, vi } from 'vitest'
import { renderMarkdown } from '#lib/content/markdown/render.server.js'
import ErrorPage from './ErrorPage.svelte'
import Page404Default from './404.default.svelte'
import PageErrorDefault from './error.default.svelte'

const layout = vi.hoisted(() => ({ absent: false }))

vi.mock('$app/paths', () => ({ resolve: (path: string) => `/garden/${path}` }))
vi.mock('$app/env', () => ({ browser: false }))
vi.mock('$app/state', () => ({
	page: {
		url: new URL('https://garden.test/missing'),
		get data() {
			if (layout.absent) return {}
			return {
				meta: {},
				config: {
					content: { text: { title: 'Garden', description: 'A garden' } },
					url: { app_assets: 'https://assets.test' }
				}
			}
		}
	},
	navigating: { to: null }
}))

// Real default pages, Markdown and banner; only Kit's public runtime is mocked.
// These are SSR assertions, not browser navigation or hydration coverage.
function page(error: App.Error) {
	return render(ErrorPage, { props: { error } }).body.replace(/<!--[\s\S]*?-->/g, '')
}

function main(output: string) {
	const body = output.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1]
	expect(body).toBeDefined()
	return body!
}

const message = 'Safe native message <detail> & context'
const statuses = [404, 403, 500, 503]
const authored = renderMarkdown('# Take a breath\n\nBrowse [the garden](/pieces).')

test.each(statuses)(
	'%i without presentation keeps the stock page and escaped message',
	(status) => {
		const output = page({ status, message })
		const body = main(output)
		expect(body).toMatch(new RegExp(`<h1[^>]*>${status === 404 ? '404' : `error ${status}`}</h1>`))
		expect(body.includes('page not found')).toBe(status === 404)
		expect(body).toContain('Safe native message &lt;detail> &amp; context')
		expect(body).not.toContain('<detail>')
		expect(body).not.toContain('class="markdown"')
		expect(body).toMatch(/<a href="\/garden\/" class="home-button[^"\n]*">go home<\/a>/)
		expect(output).toContain('aria-label="main page"')
	}
)

test.each(statuses)('%i renders authored Markdown instead of the stock body', (status) => {
	const output = page({ status, message, presentation: { html: authored, home: true } })
	const body = main(output)
	expect(body).toContain('class="markdown"')
	expect(body).toContain(authored)
	expect(body).not.toContain('Safe native message')
	expect(body).not.toContain('page not found')
	expect(body).not.toMatch(/<h1[^>]*>(?:404|error \d+)/)
	expect(body).toContain('go home')
	expect(output).toContain('aria-label="main page"')
})

test.each([404, 403, 503])('%i home=false controls only the recovery link', (status) => {
	for (const html of [undefined, '', authored]) {
		const output = page({ status, message, presentation: { html, home: false } })
		const body = main(output)
		expect(body).not.toContain('go home')
		expect(body).not.toContain('home-button')
		expect(output).toMatch(/<a href="\/garden\/" aria-label="main page">/)
		if (html === undefined) {
			expect(body).toContain('Safe native message')
		} else {
			expect(body).toContain('class="markdown"')
			expect(body).not.toContain('Safe native message')
			expect(body).not.toMatch(/<h[12]\b[^>]*>(?:404|error \d+|page not found)/)
			if (html === '') expect(body).not.toMatch(/<h[12]\b|<p\b/)
		}
	}
})

test('empty Markdown still allows an independent recovery link', () => {
	const body = main(page({ status: 404, message, presentation: { html: '', home: true } }))
	expect(body).toContain('class="markdown"')
	expect(body).not.toContain('Safe native message')
	expect(body).not.toContain('page not found')
	expect(body).toContain('go home')
})

test('absent layout data supports authored errors and stock no-presentation rendering in SSR', () => {
	layout.absent = true
	try {
		const customized = page({ status: 500, message, presentation: { html: authored, home: false } })
		expect(main(customized)).toContain(authored)
		expect(main(customized)).not.toContain('Safe native message')
		expect(main(customized)).not.toContain('go home')
		expect(customized).toContain('aria-label="main page"')

		// No presentation also models the stock rendering input used by browser fallbacks,
		// without asserting browser execution here.
		const stock = page({ status: 404, message })
		expect(main(stock)).toContain('page not found')
		expect(main(stock)).toContain('Safe native message &lt;detail> &amp; context')
		expect(main(stock)).not.toContain('class="markdown"')
		expect(main(stock)).toContain('go home')
		expect(stock).toContain('aria-label="main page"')
	} finally {
		layout.absent = false
	}
})

test('default components retain their own fallback copy and recovery links', () => {
	const missing = main(render(Page404Default, { props: {} }).body)
	const failed = main(render(PageErrorDefault, { props: { status: 500 } }).body)
	expect(missing).toContain('there are no pieces at this path.')
	expect(failed).toContain('an unexpected error occurred')
	for (const body of [missing, failed]) expect(body).toContain('go home')
})
