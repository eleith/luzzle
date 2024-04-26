export default interface Frontmatter {
	title: string
	url: string
	is_active: boolean
	is_paywall: boolean
	type: 'article' | 'bookmark'
	author?: string
	coauthors?: string
	subtitle?: string
	summary?: string
	keywords?: string
	representative_image?: string
	archive_url?: string
	archive_path?: string
	date_published?: string
	date_accessed?: string
	word_count?: number
}
