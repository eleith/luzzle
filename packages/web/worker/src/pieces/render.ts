import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { render } from 'svelte/server'
import { ImageResponse } from 'takumi-js/response'
import { createPieceHelpers } from '@luzzle/web.pieces'
import type { PublicWebPiece, PublicWebPieceAsset } from '@luzzle/web.pieces'
import { mapOpengraphTemplate } from '@luzzle/web.templates/pieces/fields'
import type { TemplateConfig } from '@luzzle/web.templates/config'
import { generateThemeCss } from '@luzzle/web.theme'

const OpengraphImageWidth = 1200
const OpengraphImageHeight = 630
const PIECES_ASSETS_PREFIX = '/pieces/assets/'

let cachedStaticStylesheets: string[] | null = null
let cachedFontData: Buffer | null = null
let cachedFontUrl: string | null = null

function loadStaticAssets(config: TemplateConfig) {
	const require = createRequire(import.meta.url)
	const resetCss = readFileSync(require.resolve('@luzzle/web.theme/styles/reset.css'), 'utf8')
	const baseCss = readFileSync(require.resolve('@luzzle/web.theme/styles/base.css'), 'utf8')
	const markdownCss = readFileSync(require.resolve('@luzzle/web.theme/styles/markdown.css'), 'utf8')
	cachedStaticStylesheets = [resetCss, baseCss, markdownCss]

	const globals = config.theme?.globals || {}
	const fontUrl =
		(globals['font-sans-url'] as string | undefined)?.replace(/['"]/g, '') ||
		'/fonts/noto-sans.woff2'

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
		const diskPath = path.join(
			assetsDir,
			decodeURIComponent(url.slice(PIECES_ASSETS_PREFIX.length))
		)
		try {
			resources.push({ src: url, data: readFileSync(diskPath) })
		} catch (err) {
			console.warn(`[takumi] failed to load image ${url} from ${diskPath}:`, err)
		}
	}
	return resources
}

async function renderOpengraphHtml(
	piece: PublicWebPiece,
	assets: PublicWebPieceAsset[],
	config: TemplateConfig
) {
	const pieceConfig = config.pieces.find((entry) => entry.type === piece.type)
	const helpers = createPieceHelpers(
		assets,
		(p) => `${PIECES_ASSETS_PREFIX}${p.split('/').map(encodeURIComponent).join('/')}`,
		() => `/pieces/${piece.type}/${piece.slug}`
	)
	const template = mapOpengraphTemplate(piece, pieceConfig)
	const { getCompiledOpengraphModule } = await import('./compile.js')
	const component = await getCompiledOpengraphModule(template.name)
	return render(component.default, { props: { piece, fields: template.fields, helpers } })
}

function prepareTakumiMarkup(rendered: { body: string; head: string }) {
	const head = rendered.head.replace(/:where\(\.svelte-[a-z0-9]+\)/gi, '')
	const body = rendered.body.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><')
	const style = `display:flex;width:${OpengraphImageWidth}px;height:${OpengraphImageHeight}px`
	return { body, html: `${head}<div style="${style}">${body}</div>` }
}

function getAssetsDirectory(config: TemplateConfig, outDir?: string): string {
	if (!config.paths.config) {
		throw new Error('config.paths.config is missing; cannot resolve assets path')
	}
	return outDir ? outDir : path.resolve(path.dirname(config.paths.config), config.paths.assets)
}

export async function renderOpengraphPng(
	piece: PublicWebPiece,
	assets: PublicWebPieceAsset[],
	config: TemplateConfig,
	outDir?: string
): Promise<Buffer> {
	const { staticStylesheets, fontData } = loadStaticAssets(config)
	const stylesheets = [...staticStylesheets, generateThemeCss(config)]
	const markup = prepareTakumiMarkup(await renderOpengraphHtml(piece, assets, config))
	const fetchedResources = loadLocalImageResources(markup.body, getAssetsDirectory(config, outDir))
	const globals = config.theme?.globals || {}
	const fontName =
		(globals['font-sans-name'] as string | undefined)?.replace(/['"]/g, '') || 'Noto Sans'
	const response = new ImageResponse(markup.html, {
		width: OpengraphImageWidth,
		height: OpengraphImageHeight,
		stylesheets,
		fonts: fontData ? [{ name: fontName, data: fontData }] : undefined,
		fetchedResources,
		onError: (err: unknown) => {
			console.error('[takumi] render error:', err)
		},
	})
	return Buffer.from(await response.arrayBuffer())
}
