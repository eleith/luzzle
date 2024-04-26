import { JSONSchemaType } from 'ajv'
import type Frontmatter from './interface.js'

const FrontmatterJSONSchema: JSONSchemaType<Frontmatter> = {
	title: 'Book',
	type: 'object',
	properties: {
		title: {
			type: 'string',
		},
		subtitle: {
			type: 'string',
			nullable: true,
		},
		summary: {
			type: 'string',
			nullable: true,
		},
		representative_image: {
			type: 'string',
			format: 'asset',
			nullable: true,
		},
		attachments: {
			type: 'array',
			items: {
				type: 'string',
				format: 'asset',
			},
			nullable: true,
		},
		keywords: {
			type: 'string',
			nullable: true,
		},
		date_published: {
			type: 'string',
			format: 'date',
			nullable: true,
		},
	},
	required: ['title'],
	additionalProperties: false,
}

export default FrontmatterJSONSchema
