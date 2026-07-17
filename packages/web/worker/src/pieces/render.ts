import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { render } from 'svelte/server'
import { ImageResponse } from 'takumi-js/response'
import { createPieceHelpers } from '@luzzle/web.pieces'
import type { PublicWebPiece, PublicWebPieceAsset } from '@luzzle/web.pieces'
import { getCompiledOpengraphModule } from './compile.js'
import { generateThemeCss } from '@luzzle/web.theme'
import type { Config } from '@luzzle/web.config'
import type { Component } from 'svelte'

const OpengraphImageWidth = 1200
const OpengraphImageHeight = 630
const PIECES_ASSETS_PREFIX = '/pieces/assets/'

let cachedStaticStylesheets: string[] | null = null
let cachedFontData: Buffer | null = null
let cachedFontUrl: string | null = null

function loadStaticAssets(config: Config) {
	const require = createRequire(import.meta.url)
	const resetCss = readFileSync(require.resolve('@luzzle/web.theme/styles/reset.css'), 'utf8')
	const baseCss = readFileSync(require.resolve('@luzzle/web.theme/styles/base.css'), 'utf8')
	const markdownCss = readFileSync(require.resolve('@luzzle/web.theme/styles/markdown.css'), 'utf8')
	cachedStaticStylesheets = [resetCss, baseCss, markdownCss]

	const globals = config.theme?.globals || {}
	const fontUrl = (globals['font-sans-url'] as string | undefined)?.replace(/['"]/g, '') || '/fonts/noto-sans.woff2'

	if (cachedFontData && cachedFontUrl === fontUrl) {
		return { staticStylesheets: cachedStaticStylesheets, fontData: cachedFontData }
	}

	const staticDir = config.paths.config
		? path.resolve(path.dirname(config.paths.config), config.paths.static)
		: config.paths.static
	const fontPath = path.join(staticDir, fontUrl)

	if (!existsSync(fontPath)) {
		console.warn(`[render] Font not found at "${fontPath}". Takumi will use default fonts.`)
		cachedFontData = null
		cachedFontUrl = fontUrl
		return { staticStylesheets: cachedStaticStylesheets, fontData: null }
	}

	const fontData = readFileSync(fontPath)
	cachedFontData = fontData
	cachedFontUrl = fontUrl

	return { staticStylesheets: cachedStaticStylesheets, fontData }
}

function loadLocalImageResources(body: string, assetsDir: string) {
	const urls = new Set<string>()
	for (const m of body.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
		urls.add(m[1])
	}

	const resources: { src: string; data: Buffer }[] = []
	for (const url of urls) {
		if (!url.startsWith(PIECES_ASSETS_PREFIX)) continue
		const diskPath = path.join(assetsDir, url.slice(PIECES_ASSETS_PREFIX.length))
		try {
			resources.push({ src: url, data: readFileSync(diskPath) })
		} catch (err) {
			console.warn(`[takumi] failed to load image ${url} from ${diskPath}:`, err)
		}
	}
	return resources
}

export async function renderOpengraphPng(
	piece: PublicWebPiece,
	assets: PublicWebPieceAsset[],
	config: Config,
	outDir?: string
): Promise<Buffer> {
	// 1. Get compiled Svelte component
	const mod = await getCompiledOpengraphModule(piece.type, config)
	const svelteComponent = mod.default as Component<Record<string, unknown>>

	// 2. Load static stylesheet & font assets, and generate dynamic theme CSS
	const { staticStylesheets, fontData } = loadStaticAssets(config)
	const themeCss = generateThemeCss(config)
	const stylesheets = [...staticStylesheets, themeCss]

	// 3. SSR render to HTML
	const helpers = createPieceHelpers(
		assets,
		(p) => `${PIECES_ASSETS_PREFIX}${p}`,
		() => `/pieces/${piece.type}/${piece.slug}`
	)
	const { body, head } = render(svelteComponent, {
		props: { piece, helpers } as Record<string, unknown>
	})

	// 4. Clean HTML for Takumi compatibility
	const scopedHead = head.replace(/:where\(\.svelte-[a-z0-9]+\)/gi, '')
	const cleanBody = body.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><')
	const wrapperStyle = `display:flex;width:${OpengraphImageWidth}px;height:${OpengraphImageHeight}px`
	const takumiHtml = `${scopedHead}<div style="${wrapperStyle}">${cleanBody}</div>`

	// 5. Pre-load local images referenced in HTML
	if (!config.paths.config) {
		throw new Error('config.paths.config is missing; cannot resolve assets path')
	}
	const absoluteAssetsDir = outDir
		? outDir
		: path.resolve(path.dirname(config.paths.config), config.paths.assets)
	const fetchedResources = loadLocalImageResources(cleanBody, absoluteAssetsDir)

	const globals = config.theme?.globals || {}
	const fontName = (globals['font-sans-name'] as string | undefined)?.replace(/['"]/g, '') || 'Noto Sans'

	// 6. Render via Takumi
	const response = new ImageResponse(takumiHtml, {
		width: OpengraphImageWidth,
		height: OpengraphImageHeight,
		stylesheets,
		fonts: fontData ? [{ name: fontName, data: fontData }] : undefined,
		fetchedResources,
		onError: (err: unknown) => {
			console.error('[takumi] render error:', err)
		}
	})

	const arrayBuffer = await response.arrayBuffer()
	return Buffer.from(arrayBuffer)
}
