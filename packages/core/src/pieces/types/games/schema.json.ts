import { JSONSchemaType } from 'ajv'
import type Frontmatter from './interface.js'

const FrontmatterJSONSchema: JSONSchemaType<Frontmatter> = {
	title: 'Game',
	type: 'object',
	properties: {
		title: {
			type: 'string',
		},
		url: {
			type: 'string',
			pattern: '^(http|https)://',
			nullable: true,
		},
		type: {
			type: 'string',
			enum: ['video', 'board'],
		},
		publisher: {
			type: 'string',
			nullable: true,
		},
		developer: {
			type: 'string',
			nullable: true,
		},
		description: {
			type: 'string',
			nullable: true,
		},
		keywords: {
			type: 'string',
			nullable: true,
		},
		representative_image: {
			type: 'string',
			format: 'asset',
			nullable: true,
		},
		date_published: {
			type: 'string',
			format: 'date',
			nullable: true,
		},
		date_played: {
			type: 'string',
			format: 'date',
			nullable: true,
		},
		play_time: {
			type: 'integer',
			nullable: true,
		},
		number_of_players: {
			type: 'integer',
			nullable: true,
		},
		played_on: {
			nullable: true,
			type: 'string',
			enum: [
				'xbox 360',
				'android',
				'nes',
				'snes',
				'gamecube',
				'wii',
				'switch',
				'gameboy',
				'gameboy advance sp',
				'ds',
				'n64',
				'steam',
				'pc',
				'playstation 5',
				'irl',
				'web',
				'stadia',
			],
		},
	},
	required: ['title', 'type'],
	additionalProperties: true,
}

export default FrontmatterJSONSchema
