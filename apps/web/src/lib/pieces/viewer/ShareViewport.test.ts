import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import { OpengraphImageWidth, OpengraphImageHeight } from '@luzzle/web.pieces'
import ShareViewport from './ShareViewport.svelte'
import { publishedPiece as rawPublishedPiece, asset } from './fixtures/published'

const publishedPiece = {
	...rawPublishedPiece,
	templates: {
		icon: { name: 'default', fields: { image: 'cover' } },
		page: { name: 'default', fields: { image: 'cover' } },
		opengraph: { name: 'default', fields: { image: 'cover' } }
	}
}

vi.mock('$app/state', () => ({
	page: { data: { config: { url: { app: '/garden', luzzle_assets: '/cdn' } } } }
}))
vi.mock('$app/paths', () => ({
	resolve: (route: string, params: Record<string, string>) =>
		route.replace(/\[(?:\.\.\.)?(\w+)\]/g, (_, name: string) => params[name])
}))
// This synchronous stub establishes viewport markup and helper URLs,
// not the actual static renderer or client prop updates.
vi.mock('$lib/pieces/components/opengraph.svelte', async () => ({
	default: (await import('./fixtures/Composition.svelte')).default
}))

test('shows only the composition with published assets, without explanatory text', () => {
	const html = render(ShareViewport, { props: { piece: publishedPiece } }).body
	expect(html).toContain('aria-label="Share"')
	expect(html).not.toContain('Rendered share composition')
	expect(html).not.toContain('Reconstructed with')
	expect(html).not.toContain('not the generated PNG')
	expect(html).not.toContain('<h1')
	expect(html).not.toContain('<p')
	expect(html).toContain('data-renderer="composition"')
	expect(html).toContain('src="/cdn/pieces/assets/published/cover.jpg"')
	expect(html).not.toContain('/admin/asset')
	expect(html).not.toContain('/admin/preview')
	expect(html).not.toContain('Open generated share image')
	expect(html).toContain(`max-width: ${OpengraphImageWidth}px; height: ${OpengraphImageHeight}px`)
	expect(html).toContain(`width: ${OpengraphImageWidth}px; height: ${OpengraphImageHeight}px`)
	expect(html.match(/<main /g)).toHaveLength(1)
})

test('recorded generated PNG remains separate from the composition', () => {
	const piece = {
		...publishedPiece,
		assets: [...publishedPiece.assets, asset('opengraph', 'actual-share.png', 'piece', 'image/png')]
	}
	const html = render(ShareViewport, { props: { piece } }).body
	expect(html).toContain('data-renderer="composition"')
	expect(html).not.toContain('actual-share.png')
	expect(html).not.toContain('Open generated share image')
})

test('missing assets still permit reconstruction without claiming a generated file', () => {
	const html = render(ShareViewport, { props: { piece: { ...publishedPiece, assets: [] } } }).body
	expect(html).toContain('aria-label="Share"')
	expect(html).toContain('data-renderer="composition"')
	expect(html).not.toContain('Rendered share composition')
	expect(html).not.toContain('Open generated share image')
	expect(html).not.toContain('/pieces/assets/')
})
