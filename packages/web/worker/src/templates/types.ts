import type { Config } from '@luzzle/web.config'

export type SiteSlot = keyof NonNullable<Config['content']['component']>

export interface TemplateSource {
	source: string
	filename: string
}

export type { TemplateLookup } from '@luzzle/web.templates/bundle'
