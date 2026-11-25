import { getPieceConfig } from '@luzzle/web.config'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { ImageResponse } from 'takumi-js/response'
import { assetPathToUrl, createPieceHelpers, publicPieceHref } from '@luzzle/web.pieces'
import type { PublicWebPiece, PublicWebPieceAsset } from '@luzzle/web.pieces'
import { mapDefaultOpengraphFields } from '@luzzle/web.templates/pieces/fields'
import type { TemplateConfig } from '@luzzle/web.templates/config'
import { generateThemeCss } from '@luzzle/web.theme'
import { readConfiguredAsset } from '@luzzle/web.config/assets'
import { renderAuthoredOpengraph, renderOpengraphFile } from '@luzzle/web.templates/server'
import { defaultOpengraphFile, opengraphCaches, type OpengraphMode } from './authored-opengraph.js'

const OpengraphImageWidth = 1200
const OpengraphImageHeight = 630

async function readFont(config: TemplateConfig): Promise<Buffer | null> {
	const source = config.content.fonts.sans
	if (source) {
		const bytes = await readConfiguredAsset(config, source)
		if (bytes) return Buffer.from(bytes)
		console.warn('[render] Configured sans font unavailable. Takumi will use default fonts.')
		return null
	}

	const fontUrl =
		config.theme.globals['font-sans-url'].replace(/['"]/g, '') || '/fonts/noto-sans.woff2'
	const staticDir = config.paths.config
		? path.resolve(path.dirname(config.paths.config), config.paths.static)
		: config.paths.static
	const fontPath = path.join(staticDir, fontUrl)
	if (!existsSync(fontPath)) {
		console.warn(`[render] Font not found at "${fontPath}". Takumi will use default fonts.`)
		return null
	}
	return readFileSync(fontPath)
}

const require = createRequire(import.meta.url)
let packagedStylesheets: string[] | undefined

function getPackagedStylesheets() {
	return packagedStylesheets ??= ['reset', 'base', 'markdown'].map((name) =>
		readFileSync(require.resolve(`@luzzle/web.theme/styles/${name}.css`), 'utf8')
	)
}

function loadLocalImageResources(assetsDir: string, pathsByUrl: Map<string, string>) {
	const resources: { src: string; data: Buffer }[] = []
	for (const [url, assetPath] of pathsByUrl) {
		const diskPath = path.join(assetsDir, assetPath)
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
	config: TemplateConfig,
	mode: OpengraphMode
) {
	const pieceConfig = getPieceConfig(config.pieces, piece.type)
	// Resolve rendered image URLs only to the validated paths used to produce them.
	const pathsByUrl = new Map<string, string>()
	const helpers = createPieceHelpers(
		assets,
		(assetPath) => {
			const url = assetPathToUrl(assetPath, '')
			if (url) pathsByUrl.set(url, assetPath)
			return url
		},
		() => publicPieceHref(piece, config.url.app)
	)
	const cache = opengraphCaches[mode]
	const selection = pieceConfig?.templates?.opengraph
	if (selection && 'file' in selection) {
		const { html, css } = await renderAuthoredOpengraph(cache, selection, piece, helpers)
		return { html, css, pathsByUrl }
	}
	const fields = mapDefaultOpengraphFields(piece, pieceConfig)
	const { html, css } = await renderOpengraphFile(cache, defaultOpengraphFile, piece, fields, helpers)
	return { html, css, pathsByUrl }
}

function prepareTakumiMarkup(rendered: { html: string; css: string }) {
	const css = rendered.css.replace(/:where\(\.svelte-[a-z0-9]+\)/gi, '')
	const body = rendered.html.replace(/<!--[\s\S]*?-->/g, '')
	const style = `display:flex;width:${OpengraphImageWidth}px;height:${OpengraphImageHeight}px`
	return `<style>${css}</style><div style="${style}">${body}</div>`
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
	outDir?: string,
	mode: OpengraphMode = 'published'
): Promise<Buffer> {
	const fontData = await readFont(config)
	// Share images use fixed canvas typography, not responsive browser sizing.
	const stylesheets = [
		...getPackagedStylesheets(),
		generateThemeCss(config),
		':root { font-size: calc(var(--font-size-root) * 1px); }',
	]
	const rendered = await renderOpengraphHtml(piece, assets, config, mode)
	const html = prepareTakumiMarkup(rendered)
	const fetchedResources = loadLocalImageResources(getAssetsDirectory(config, outDir), rendered.pathsByUrl)
	const globals = config.theme?.globals || {}
	const fontName =
		(globals['font-sans-name'] as string | undefined)?.replace(/['"]/g, '') || 'Noto Sans'
	const response = new ImageResponse(html, {
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
