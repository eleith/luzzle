import { describe, expect, test, vi } from 'vitest'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import { assetPathToUrl } from '$lib/pieces/assets.js'
import { previewOutputUrl } from '$lib/pieces/preview/output-url.js'
import {
	createPageTemplateHelpers,
	createTemplateHelpers,
	type TemplateUrlBuilders
} from './template-helpers.js'

function piece(): PublicWebPiece {
	return {
		id: 'piece-id',
		key: 'piece-key',
		title: 'A piece',
		slug: 'a piece',
		type: 'another/type',
		date_added: 1,
		metadata: { cover: 'cover' },
		keywords: '[]',
		assets: [
			{
				asset_key: 'cover',
				transformation: 'image.original',
				asset_path: 'custom-kind/cover key/original.jpg',
				mime_type: 'image/jpeg'
			},
			{
				asset_key: 'cover',
				transformation: 'palette',
				content: '{"accent":"#123456"}',
				mime_type: 'application/json'
			},
			{
				asset_key: 'piece-key',
				transformation: 'markdown',
				content: '<p>Prepared note</p>',
				mime_type: 'text/html'
			}
		]
	}
}

function publicUrls(): TemplateUrlBuilders {
	const base = 'https://public.example/garden'
	return {
		buildPieceUrl: (piece) =>
			`${base}/pieces/${encodeURIComponent(piece.type)}/${encodeURIComponent(piece.slug)}`,
		buildAssetUrl: (assetPath) => assetPathToUrl(assetPath, base),
		buildStaticAssetUrl: (relativePath) =>
			relativePath === 'images/mark.svg' ? `${base}/site-assets/images/mark.svg` : undefined
	}
}

function previewUrls(job: string): TemplateUrlBuilders {
	return { ...publicUrls(), buildAssetUrl: (assetPath) => previewOutputUrl(assetPath, job) }
}

describe('createPageTemplateHelpers', () => {
	test('adds an opt-in navigation helper while retaining the base helpers', () => {
		const onNavigation = vi.fn()
		const helpers = createPageTemplateHelpers(publicUrls(), onNavigation)
		expect(onNavigation).not.toHaveBeenCalled()
		expect(helpers.forPiece(piece()).getPalette()).toEqual({ accent: '#123456' })
		expect(helpers.getStaticAssetUrl('images/mark.svg')).toBe(
			'https://public.example/garden/site-assets/images/mark.svg'
		)
		helpers.showNavBanner()
		expect(onNavigation).toHaveBeenCalledExactlyOnceWith({})
		expect(createTemplateHelpers(publicUrls())).not.toHaveProperty('showNavBanner')
	})

	test('reports a snapshot of only the supplied colors and omits undefined overrides', () => {
		const onNavigation = vi.fn()
		const helpers = createPageTemplateHelpers(publicUrls(), onNavigation)
		const colors = {
			background: 'var(--color-primary)',
			color: undefined,
			hoverColor: 'var(--color-secondary)',
			showRandom: true
		}
		helpers.showNavBanner(colors)
		colors.background = 'var(--color-surface)'
		expect(onNavigation).toHaveBeenCalledExactlyOnceWith({
			background: 'var(--color-primary)',
			hoverColor: 'var(--color-secondary)'
		})
	})
})

describe('createTemplateHelpers', () => {
	test('binds the accepted piece API to existing URL, palette, image and content helpers', () => {
		const source = piece()
		const before = structuredClone(source)
		const bound = createTemplateHelpers(publicUrls()).forPiece(source)
		expect(bound.getUrl()).toBe('https://public.example/garden/pieces/another%2Ftype/a%20piece')
		expect(bound.getPalette()).toEqual({ accent: '#123456' })
		expect(bound.getImageUrl('cover', 125, 'jpg')).toBe(
			'https://public.example/garden/pieces/assets/custom-kind/cover%20key/original.jpg'
		)
		expect(bound.getAssetUrl('cover', 'image.original')).toBe(
			bound.getImageUrl('cover', 125, 'jpg')
		)
		expect(bound.getAssetContent('piece-key', 'markdown')).toBe('<p>Prepared note</p>')
		expect(source).toEqual(before)
	})

	test.each([
		[125, 's'],
		[126, 'm'],
		[250, 'm'],
		[251, 'l'],
		[500, 'l'],
		[501, 'xl']
	] as const)('preserves the existing image size selection at width %i', (width, size) => {
		const source = piece()
		for (const variant of ['s', 'm', 'l', 'xl'])
			source.assets.push({
				asset_key: 'cover',
				transformation: `image.${variant}.jpg`,
				asset_path: `custom-kind/${variant}.jpg`,
				mime_type: 'image/jpeg'
			})
		expect(
			createTemplateHelpers(publicUrls()).forPiece(source).getImageUrl('cover', width, 'jpg')
		).toBe(`https://public.example/garden/pieces/assets/custom-kind/${size}.jpg`)
	})

	test('keeps format selection and original-image fallback in the existing piece helper', () => {
		const source = piece()
		source.assets.push({
			asset_key: 'cover',
			transformation: 'image.s.webp',
			asset_path: 'custom-kind/s.webp',
			mime_type: 'image/webp'
		})
		const bound = createTemplateHelpers(publicUrls()).forPiece(source)
		expect(bound.getImageUrl('cover', 125, 'webp')).toBe(
			'https://public.example/garden/pieces/assets/custom-kind/s.webp'
		)
		expect(bound.getImageUrl('cover', 125, 'png')).toBe(
			'https://public.example/garden/pieces/assets/custom-kind/cover%20key/original.jpg'
		)
	})

	test('returns absence for missing assets without inventing empty content', () => {
		const source = { ...piece(), assets: [] }
		const bound = createTemplateHelpers(publicUrls()).forPiece(source)
		expect(bound.getPalette()).toBeUndefined()
		expect(bound.getImageUrl('cover', 125, 'jpg')).toBeUndefined()
		expect(bound.getImageUrl(null, 125, 'jpg')).toBeUndefined()
		expect(bound.getAssetUrl('missing', 'download')).toBeUndefined()
		expect(bound.getAssetContent('missing', 'markdown')).toBeUndefined()
	})

	test('falls back to a valid original when a transformed asset path cannot be linked', () => {
		const source = piece()
		source.assets.push({
			asset_key: 'cover',
			transformation: 'image.s.jpg',
			asset_path: '../private.jpg',
			mime_type: 'image/jpeg'
		})
		const before = structuredClone(source)
		const bound = createTemplateHelpers(publicUrls()).forPiece(source)
		expect(bound.getImageUrl('cover', 125, 'jpg')).toBe(
			'https://public.example/garden/pieces/assets/custom-kind/cover%20key/original.jpg'
		)
		expect(source).toEqual(before)
	})

	test.each([
		undefined,
		'',
		'../private.jpg',
		'/private.jpg',
		'custom-kind//cover.jpg',
		'https://other.example/cover.jpg',
		'custom-kind\\cover.jpg'
	])('does not link invalid asset paths: %j', (assetPath) => {
		const source = piece()
		source.assets[0].asset_path = assetPath
		const before = structuredClone(source)
		const bound = createTemplateHelpers(publicUrls()).forPiece(source)
		expect(bound.getImageUrl('cover', 125, 'jpg')).toBeUndefined()
		expect(bound.getAssetUrl('cover', 'image.original')).toBeUndefined()
		expect(bound.getPalette()).toEqual({ accent: '#123456' })
		expect(bound.getAssetContent('piece-key', 'markdown')).toBe('<p>Prepared note</p>')
		expect(source).toEqual(before)
	})

	test.each([undefined, ''])(
		'turns a rejected URL into absence without losing inline content: %j',
		(rejected) => {
			const source = piece()
			const before = structuredClone(source)
			const urls = { ...publicUrls(), buildAssetUrl: () => rejected }
			const bound = createTemplateHelpers(urls).forPiece(source)
			expect(bound.getImageUrl('cover', 125, 'jpg')).toBeUndefined()
			expect(bound.getAssetUrl('cover', 'image.original')).toBeUndefined()
			expect(bound.getAssetContent('piece-key', 'markdown')).toBe('<p>Prepared note</p>')
			expect(bound.getPalette()).toEqual({ accent: '#123456' })
			expect(source).toEqual(before)
		}
	)

	test('keeps published and preview URL contexts independent for the same source piece', () => {
		const source = piece()
		const published = createTemplateHelpers(publicUrls()).forPiece(source)
		const preview = createTemplateHelpers(previewUrls('selected job')).forPiece(source)
		expect(preview.getImageUrl('cover', 125, 'jpg')).toBe(
			'/admin/preview/selected%20job/asset/custom-kind/cover%20key/original.jpg'
		)
		expect(published.getImageUrl('cover', 125, 'jpg')).toBe(
			'https://public.example/garden/pieces/assets/custom-kind/cover%20key/original.jpg'
		)
		expect(preview.getUrl()).toBe(published.getUrl())
		expect(preview.getPalette()).toEqual(published.getPalette())
	})

	test('does not share helper state between preview jobs, including after an await', async () => {
		const source = piece()
		const first = createTemplateHelpers(previewUrls('first job')).forPiece(source)
		await Promise.resolve()
		const second = createTemplateHelpers(previewUrls('second job')).forPiece(source)
		expect(first.getAssetUrl('cover', 'image.original')).toContain('/first%20job/')
		expect(second.getAssetUrl('cover', 'image.original')).toContain('/second%20job/')
	})

	test('never substitutes published URLs when the preview URL builder cannot link an asset', () => {
		const bound = createTemplateHelpers(previewUrls('../invalid')).forPiece(piece())
		expect(bound.getImageUrl('cover', 125, 'jpg')).toBeUndefined()
		expect(bound.getAssetUrl('cover', 'image.original')).toBeUndefined()
		expect(bound.getAssetContent('piece-key', 'markdown')).toBe('<p>Prepared note</p>')
	})

	test('delegates static-asset availability and URL construction to the caller', () => {
		const urls = publicUrls()
		const staticUrl = vi.spyOn(urls, 'buildStaticAssetUrl')
		const helpers = createTemplateHelpers(urls)
		expect(helpers.getStaticAssetUrl('images/mark.svg')).toBe(
			'https://public.example/garden/site-assets/images/mark.svg'
		)
		expect(helpers.getStaticAssetUrl('missing.svg')).toBeUndefined()
		expect(staticUrl).toHaveBeenCalledWith('images/mark.svg')
		expect(staticUrl).toHaveBeenCalledWith('missing.svg')
	})

	test('propagates URL and palette errors so the render caller can choose fallback', () => {
		const failure = new Error('URL construction failed')
		const urls = {
			...publicUrls(),
			buildAssetUrl: () => {
				throw failure
			}
		}
		expect(() => createTemplateHelpers(urls).forPiece(piece())).toThrow(failure)
		const source = piece()
		source.assets[1].content = '{'
		const bound = createTemplateHelpers(publicUrls()).forPiece(source)
		expect(() => bound.getPalette()).toThrow(SyntaxError)
	})
})
