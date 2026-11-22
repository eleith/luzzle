import { randomUUID } from 'node:crypto'
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

export async function loadIconDesign(
	selection: { filename: string; mapping?: FieldMappings },
	context: RenderContext
): Promise<IconDesign> {
	const template = await designs.load(selection.filename)
	return {
		css: template.css,
		render(piece, { size, lazy }) {
			return template.render(
				{
					piece,
					fields: resolveTemplateFields(piece.metadata, selection.mapping),
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
