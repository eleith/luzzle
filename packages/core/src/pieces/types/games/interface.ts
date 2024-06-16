export default interface Frontmatter {
	title: string
	type: 'video' | 'board'
	url?: string
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
		| 'android'
		| 'nes'
		| 'snes'
		| 'n64'
		| 'gamecube'
		| 'wii'
		| 'switch'
		| 'gameboy'
		| 'gameboy advance sp'
		| 'ds'
		| 'steam'
		| 'pc'
		| 'playstation 5'
		| 'irl'
		| 'web'
		| 'stadia'
}
