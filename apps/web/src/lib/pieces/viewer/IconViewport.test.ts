import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import IconViewport from './IconViewport.svelte'
import { publishedPiece as rawPublishedPiece } from './fixtures/published'

const piece = {
	...rawPublishedPiece,
	templates: {
		icon: { name: 'default', fields: { image: 'cover' } },
		page: { name: 'default', fields: { image: 'cover' } },
		opengraph: { name: 'default', fields: { image: 'cover' } }
	}
}

const { page } = vi.hoisted(() => ({
	page: {
		data: {
			preview: false,
			job: 'preview-job',
			config: { url: { app: '/garden', luzzle_assets: '/cdn' } }
		}
	}
}))
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/paths', () => ({
	resolve: (route: string, params: Record<string, string>) =>
		route.replace(/\[(?:\.\.\.)?(\w+)\]/g, (_, name: string) => params[name])
}))
// SSR establishes the initial composition, not client resize behavior.
vi.mock('#lib/pieces/components/icon.svelte', async () => ({
	default: (await import('./fixtures/IconRenderer.svelte')).default
}))

test('starts with an eager 500px composition without imposing a height on the selected icon', () => {
	const html = render(IconViewport, { props: { piece } }).body

	expect(html).toContain('data-width="500"')
	expect(html).toContain('loading="eager"')
	const frame = html.match(/<div\b[^>]*class="icon-frame\b[^>]*>/)?.[0]
	expect(frame).toBeDefined()
	expect(frame).toContain('width: 500px; zoom: 1')
	expect(frame).not.toContain('height:')
})
