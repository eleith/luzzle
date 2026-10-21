import type { NavBannerColors } from '@luzzle/web.templates/components/props'

export interface PreparedPiecePage {
	revision: string
	body: string
	head: string
	navBanner: NavBannerColors | null
}

export enum MarkdownPublicationStatus {
	MATCHING = 'matching',
	CHANGED = 'changed',
	UNKNOWN = 'unknown'
}
