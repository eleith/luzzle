import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type { AppConfig } from '#lib/server/config.js'
import { createTemplateFileCache } from '@luzzle/web.templates/server'
import { resolveTemplateFields } from '@luzzle/web.templates/mapping'
import type { IconProps } from '@luzzle/web.templates/icons/props'
import type { FieldMappings } from '@luzzle/web.config/mapping'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import { createRenderHelpers, type RenderContext } from '#lib/pieces/helpers/render.js'

const designs = createTemplateFileCache({ reloadOnChange: process.env.LUZZLE_DEV === 'true' })

type Placement = Pick<IconProps<unknown>, 'size' | 'lazy'>

export type IconDesign = {
	css: string
	render(piece: PublicWebPiece, placement: Placement): string
}

type IconOptions = { filename: string; mapping?: FieldMappings; context: RenderContext }

export async function preloadConfiguredListingIcons(config: AppConfig) {
	for (const piece of config.pieces) await loadPublishedIcon(piece.type, config)
}

export function loadPublishedIcon(type: string, config: AppConfig) {
	const icon = config.pieces.find((piece) => piece.type === type)?.templates?.icon
	if (!icon || !('file' in icon)) return
	// Resolve beside ./config.yaml (the launcher's path), not its symlink target.
	return loadIconDesign({
		filename: resolve(icon.file),
		mapping: icon.mapping,
		context: { mode: 'published', appUrl: config.url.app, assetBaseUrl: config.url.luzzle_assets }
	})
}

export async function loadIconDesign({
	filename,
	mapping,
	context
}: IconOptions): Promise<IconDesign> {
	const template = await designs.load(filename)
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
