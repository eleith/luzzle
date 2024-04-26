import { JSONSchemaType } from 'ajv'
import type Frontmatter from './interface.js'

const FrontmatterJSONSchema: JSONSchemaType<Frontmatter> = {
	title: 'Link',
	type: 'object',
	properties: {
		title: {
			type: 'string',
		},
		url: {
			type: 'string',
			pattern: '^(http|https)://',
		},
		is_active: {
			type: 'boolean',
		},
		is_paywall: {
			type: 'boolean',
		},
		type: {
			type: 'string',
			enum: ['article', 'bookmark'],
		},
		author: {
			type: 'string',
			nullable: true,
		},
		subtitle: {
			type: 'string',
			nullable: true,
		},
		coauthors: {
			type: 'string',
			nullable: true,
		},
		summary: {
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
		archive_url: {
			type: 'string',
			pattern: '^(http|https)://',
			nullable: true,
		},
		archive_path: {
			type: 'string',
			format: 'asset',
			nullable: true,
		},
		date_published: {
			type: 'string',
			format: 'date',
			nullable: true,
		},
		date_accessed: {
			type: 'string',
			format: 'date',
			nullable: true,
		},
		word_count: {
			type: 'integer',
			nullable: true,
		},
	},
	required: ['title', 'url', 'is_active', 'is_paywall', 'type'],
	additionalProperties: false,
}

export default FrontmatterJSONSchema
