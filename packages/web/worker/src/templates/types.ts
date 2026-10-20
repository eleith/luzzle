import type { Config } from '@luzzle/web.config'

export type PieceRole = keyof NonNullable<Config['pieces'][number]['components']>
export type SiteSlot = keyof NonNullable<Config['content']['component']>

export interface TemplateLookup {
	pieces: Record<string, Partial<Record<PieceRole, string>>>
	site: Partial<Record<SiteSlot, string>>
}
