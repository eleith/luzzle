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
// The synchronous renderer stub checks the viewport's SSR contract and real asset helpers.
// Node SSR cannot verify zoom layout, natural template heights, 3D paint/shadows,
// resize/orientation updates, or ResizeObserver mounting and cleanup in a browser.
vi.mock('#lib/pieces/components/icon.svelte', async () => ({
	default: (await import('./fixtures/IconRenderer.svelte')).default
}))

test.each([
	{ preview: false, src: '/cdn/pieces/assets/published/cover.jpg' },
	{ preview: true, src: '/admin/preview/preview-job/asset/published/cover.jpg' }
])('SSR keeps eager 500px rendering and resource URLs (preview=$preview)', (state) => {
	page.data.preview = state.preview
	const html = render(IconViewport, { props: { piece } }).body

	expect(html.match(/<main\b/g)).toHaveLength(1)
	expect(html).toContain('id="main-content"')
	expect(html).toContain('aria-label="Piece icon"')
	expect(html.match(/<img\b/g)).toHaveLength(1)
	expect(html).toContain('data-renderer="icon"')
	expect(html).toContain('data-width="500"')
	expect(html).toContain('loading="eager"')
	expect(html).toContain(`src="${state.src}"`)

	// SSR starts at full size; only the client can measure the available width.
	expect(html).toContain('max-width: 500px')
	const frame = html.match(/<div\b[^>]*class="icon-frame\b[^>]*>/)?.[0]
	expect(frame).toBeDefined()
	expect(frame).toContain('width: 500px; zoom: 1')
	// Height belongs to the selected template, not a shared 750px canvas.
	expect(frame).not.toContain('height:')
})
