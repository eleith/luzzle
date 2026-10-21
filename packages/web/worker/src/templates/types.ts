import type { Config } from '@luzzle/web.config'

export type PieceRole = keyof NonNullable<Config['pieces'][number]['components']>
export type SiteSlot = keyof NonNullable<Config['content']['component']>

export interface TemplateSource {
	source: string
	filename: string
}

export type { TemplateLookup } from '@luzzle/web.templates/bundle'
