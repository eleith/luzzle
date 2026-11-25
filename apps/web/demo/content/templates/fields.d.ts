// Fields each design can use. Your site's YAML mapping chooses which values it receives.

export type ArticleIconFields = {
	image?: string
	url?: string
}

export type ArticleOpengraphFields = {
	image?: string
	url?: string
	author?: string
	wordCount?: number
}

export type ArticlePageFields = {
	image?: string
	url?: string
	author?: string
	wordCount?: number
	datePublished?: string | number
	isActive?: boolean
	isPaywalled?: boolean
}

export type BookIconFields = { image?: string; author?: string; pages?: number }

export type BookOpengraphFields = { image?: string; author?: string; pages?: number }

export type BookPageFields = {
	image?: string
	author?: string
	pages?: number
	publicationYear?: number
	url?: string
	isbn?: string
}

export type FilmIconFields = { image?: string }

export type FilmOpengraphFields = {
	image?: string
	backdrop?: string
	director?: string
	dateReleased?: number
	runtime?: number
}

export type FilmPageFields = {
	image?: string
	backdrop?: string
	dateReleased?: number
	runtime?: number
	url?: string
	category?: string
	people?: Array<string | { name: string }>
	isbn?: string
}

export type ExampleIconFields = { image?: string }

export type MusicIconFields = { image?: string }

export type MusicOpengraphFields = { image?: string; artist?: string; durationSeconds?: number }

export type MusicPageFields = {
	image?: string
	artist?: string
	durationSeconds?: number
	album?: string
	dateReleased?: number
	language?: string
	collaborators?: Array<string | { name: string }>
	url?: string
	youtubeId?: string
	spotifyId?: string
	appleMusicUrl?: string
	isrc?: string
}

export type RecipeIconFields = {
	image?: string
	ingredients?: { item: string }[]
}

export type RecipeOpengraphFields = {
	image?: string
	ingredients?: { item: string }[]
	source?: string
	prepMinutes?: number
	cookMinutes?: number
	totalMinutes?: number
}

export type RecipePageFields = {
	image?: string
	url?: string
	ingredients?: { item: string; quantity?: number | string; unit?: string; note?: string }[]
	instructions?: (string | { text: string } | { html: string })[]
	prepMinutes?: number
	cookMinutes?: number
	totalMinutes?: number
	dateUpdated?: string | number
}

export type SnippetIconFields = {
	files?: { file: string; type?: string }[]
}

export type SnippetOpengraphFields = {
	files?: { file: string; type?: string; format?: string }[]
}

export type SnippetPageFields = {
	files?: { file: string; name?: string; format?: string; type?: string }[]
	dateUpdated?: string | number
}

export type TabletopGameOpengraphFields = {
	backdrop?: string
	publisher?: string
	playTimeMinutes?: number
}

export type TabletopGamePageFields = {
	image?: string
	url?: string
	isbn?: string
	publisher?: string
	datePublished?: string | number
	playTimeMinutes?: number
	playerCount?: number
}

export type VideoGameIconFields = {
	image?: string
}

export type VideoGameOpengraphFields = {
	image?: string
	backdrop?: string
	publisher?: string
	platform?: string
	playTimeMinutes?: number
}

export type VideoGamePageFields = {
	image?: string
	url?: string
	isbn?: string
	publisher?: string
	datePublished?: string | number
	platform?: string
	playTimeMinutes?: number
}
