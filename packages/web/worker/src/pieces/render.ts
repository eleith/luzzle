import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { render } from 'svelte/server'
import { ImageResponse } from 'takumi-js/response'
import { getPieceHelpers } from './helpers.js'
import { getCompiledOpengraphModule } from './compile.js'
import { generateThemeCss } from './theme.js'
import type { Config } from '@luzzle/web.config'
import type { PublicWebPiece } from './helpers.js'
import type { Component } from 'svelte'

const OpengraphImageWidth = 1200
const OpengraphImageHeight = 630
const PIECES_ASSETS_PREFIX = '/pieces/assets/'

function getAssetsDir(): string {
	if (process.env.ASSETS_BUNDLED_DIR) {
		return process.env.ASSETS_BUNDLED_DIR
	}

	const dockerPath = '/app/assets-bundled'
	try {
		if (statSync(dockerPath).isDirectory()) {
			return dockerPath
		}
	} catch {
		// Ignore
	}

	const devPath = path.resolve(import.meta.dirname, '../../assets')
	try {
		if (statSync(devPath).isDirectory()) {
			return devPath
		}
	} catch {
		// Ignore
	}

	return path.resolve(import.meta.dirname, '../../../assets')
}

let cachedStaticStylesheets: string[] | null = null
let cachedFontData: Buffer | null = null

function loadStaticAssets(assetsDir: string) {
	if (cachedStaticStylesheets && cachedFontData) {
		return { staticStylesheets: cachedStaticStylesheets, fontData: cachedFontData }
	}

	const resetCss = readFileSync(path.join(assetsDir, 'styles/reset.css'), 'utf8')
	const baseCss = readFileSync(path.join(assetsDir, 'styles/base.css'), 'utf8')
	const markdownCss = readFileSync(path.join(assetsDir, 'styles/markdown.css'), 'utf8')
	const fontData = readFileSync(path.join(assetsDir, 'fonts/noto-sans.woff2'))

	cachedStaticStylesheets = [resetCss, baseCss, markdownCss]
	cachedFontData = fontData

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

export async function renderOpengraphPng(piece: PublicWebPiece, config: Config): Promise<Buffer> {
	// 1. Get compiled Svelte component
	const mod = await getCompiledOpengraphModule(piece.type, config)
	const svelteComponent = mod.default as Component<Record<string, unknown>>

	// 2. Load static stylesheet & font assets, and generate dynamic theme CSS
	const assetsDir = getAssetsDir()
	const { staticStylesheets, fontData } = loadStaticAssets(assetsDir)
	const themeCss = generateThemeCss(config)
	const stylesheets = [...staticStylesheets, themeCss]

	// 3. SSR render to HTML
	const helpers = getPieceHelpers(piece)
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
	const absoluteAssetsDir = path.resolve(path.dirname(config.paths.config), config.paths.assets)
	const fetchedResources = loadLocalImageResources(cleanBody, absoluteAssetsDir)

	// 6. Render via Takumi
	const response = new ImageResponse(takumiHtml, {
		width: OpengraphImageWidth,
		height: OpengraphImageHeight,
		stylesheets,
		fonts: [{ name: 'Noto Sans', data: fontData }],
		fetchedResources,
		onError: (err: unknown) => {
			console.error('[takumi] render error:', err)
		}
	})

	const arrayBuffer = await response.arrayBuffer()
	return Buffer.from(arrayBuffer)
}
