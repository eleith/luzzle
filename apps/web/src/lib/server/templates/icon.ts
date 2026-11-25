import { getPieceConfig } from '@luzzle/web.config'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type { AppConfig } from '#lib/server/config.js'
import { createAuthoredTemplateCaches } from './cache.js'
import { resolveTemplateFields } from '@luzzle/web.templates/mapping'
import type { IconProps } from '@luzzle/web.templates/icons/props'
import type { FieldMappings } from '@luzzle/web.config/mapping'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import { createRenderHelpers, type RenderContext } from '#lib/pieces/helpers/render.js'

const designs = createAuthoredTemplateCaches()

export type IconImageProps = Pick<IconProps<unknown>, 'size' | 'lazy'>

export type IconDesign = {
	css: string
	render(piece: PublicWebPiece, props: IconImageProps): string
}

type IconOptions = { filename: string; mapping?: FieldMappings; context: RenderContext }

export async function preloadAuthoredIcons(config: AppConfig) {
	for (const piece of Object.values(config.pieces)) {
		const icon = piece.templates?.icon
		if (!icon || !('file' in icon)) continue
		const filename = resolve(icon.file)
		await Promise.all([designs.published.load(filename), designs.preview.load(filename)])
	}
}

export function publishedIconContext(config: AppConfig): RenderContext {
	return { mode: 'published', appUrl: config.url.app, assetBaseUrl: config.url.luzzle_assets }
}

export function loadPublishedIcon(type: string, config: AppConfig) {
	return loadAuthoredIcon(type, config, publishedIconContext(config))
}

function loadAuthoredIcon(type: string, config: AppConfig, context: RenderContext) {
	const icon = getPieceConfig(config.pieces, type)?.templates?.icon
	if (!icon || !('file' in icon)) return
	// Resolve beside ./config.yaml (the launcher's path), not its symlink target.
	return loadIconDesign({
		filename: resolve(icon.file),
		mapping: icon.mapping,
		context
	})
}

export async function renderAuthoredIcon(
	piece: PublicWebPiece,
	config: AppConfig,
	props: IconImageProps,
	context: RenderContext
) {
	try {
		const design = await loadAuthoredIcon(piece.type, config, context)
		if (design) return { html: design.render(piece, props), css: design.css }
	} catch (cause) {
		console.error(`Cannot render configured icon for ${piece.type}/${piece.slug}`, cause)
	}
}

export async function loadIconDesign({
	filename,
	mapping,
	context
}: IconOptions): Promise<IconDesign> {
	const template = await designs[context.mode].load(filename)
	return {
		css: template.css,
		render(piece, { size, lazy }) {
			return template.render(
				{
					piece,
					fields: resolveTemplateFields(piece.metadata, mapping),
					helpers: createRenderHelpers(piece, context),
					size,
					lazy
				},
				// Each fragment is a separate Svelte render but shares the host document's IDs.
				{ idPrefix: `icon-${randomUUID()}-` }
			)
		}
	}
}
