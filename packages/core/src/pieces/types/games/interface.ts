export default interface Frontmatter {
	title: string
	type: 'video' | 'board'
	url?: string
	archive_url?: string
	publisher?: string
	developer?: string
	description?: string
	keywords?: string
	representative_image?: string
	date_published?: string
	date_played?: string
	play_time?: number
	number_of_players?: number
	played_on?:
		| 'xbox 360'
		| 'switch'
		| 'android'
		| 'nes'
		| 'snes'
		| 'gamecube'
		| 'wii'
		| 'switch'
		| 'gameboy'
		| 'gameboy advance sp'
		| 'ds'
		| 'steam deck'
		| 'pc'
		| 'playstation 5'
		| 'irl'
}
