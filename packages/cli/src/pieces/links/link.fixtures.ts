import { merge } from 'lodash-es'
import { LinkMarkDown } from './link.schemas.js'
import { Link, LinkInsert, LinkUpdate } from '@luzzle/kysely'

const id = 'link-id'
const title = 'title of the link'
const note = 'a note about the link'
const slug = 'slugified-title'
const type = 'article'
const active = true
const date_accessed = new Date('2201-12-11').getTime()
const url = 'https://example.com'

function makeLinkMarkDown(overrides: DeepPartial<LinkMarkDown> = {}): LinkMarkDown {
	return merge(
		{
			slug,
			frontmatter: {
				title,
				active,
				date_accessed,
				type,
				url,
			},
			markdown: note,
		},
		overrides as LinkMarkDown
	)
}

function makeLink(overrides: Partial<Link> = {}): Link {
	return {
		id: 'link-id',
		title,
		subtitle: null,
		author: null,
		coauthors: null,
		summary: null,
		date_accessed,
		date_published: new Date('2201-11-11').getTime(),
		date_added: new Date('2201-11-11').getTime(),
		date_updated: new Date('2201-11-11').getTime(),
		keywords: null,
		archive_path: null,
		archive_url: null,
		screenshot_path: null,
		type,
		url,
		active: true,
		slug,
		note,
		...overrides,
	}
}

function makeLinkInsert(overrides: Partial<LinkInsert> = {}): LinkInsert {
	return {
		id: 'link-id',
		title,
		subtitle: null,
		coauthors: null,
		summary: null,
		keywords: null,
		type,
		active,
		url,
		slug,
		note,
		...overrides,
	}
}

function makeLinkUpdateInput(overrides: Partial<LinkUpdate> = {}): LinkUpdate {
	return {
		id: 'link-id',
		...overrides,
	}
}

function makeLinkCreateInput(overrides: Partial<LinkInsert> = {}): LinkInsert {
	return {
		id,
		title,
		active: true,
		type: 'article',
		url: 'https://www.example.com',
		slug,
		...overrides,
	}
}

export { makeLinkMarkDown, makeLink, makeLinkInsert, makeLinkUpdateInput, makeLinkCreateInput }
