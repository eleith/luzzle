import { JSONSchemaType } from 'ajv'
import type Frontmatter from './interface.js'

const FrontmatterJSONSchema: JSONSchemaType<Frontmatter> = {
	title: 'Book',
	type: 'object',
	properties: {
		title: {
			type: 'string',
		},
		author: {
			type: 'string',
		},
		id_ol_book: {
			type: 'string',
			nullable: true,
		},
		id_ol_work: {
			type: 'string',
			nullable: true,
		},
		isbn: {
			type: 'string',
			pattern: '((?:[\\dX]{13})|(?:[\\d\\-X]{17})|(?:[\\dX]{10})|(?:[\\d\\-X]{13}))',
			nullable: true,
		},
		subtitle: {
			type: 'string',
			nullable: true,
		},
		description: {
			type: 'string',
			nullable: true,
		},
		pages: {
			type: 'integer',
			nullable: true,
		},
		year_first_published: {
			type: 'integer',
			nullable: true,
		},
		cover: {
			type: 'string',
			format: 'asset',
			nullable: true,
		},
		keywords: {
			type: 'string',
			nullable: true,
		},
		date_read: {
			type: 'string',
			format: 'date',
			nullable: true,
		},
	},
	required: ['title', 'author'],
	additionalProperties: false,
}

export default FrontmatterJSONSchema
