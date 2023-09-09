import { differenceWith } from 'lodash-es'
import { Context } from '../commands/utils/types.js'
import slugify from '@sindresorhus/slugify'
import { createId } from '@paralleldrive/cuid2'

export const TagMapTypes = {
	BOOKS: 'books',
} as const

export type TagMapType = typeof TagMapTypes[keyof typeof TagMapTypes]

function keywordsToTags(keywords: string): string[] {
	const tags = keywords
		.split(',')
		.map((keyword) => keyword.trim())
		.filter((keyword) => keyword !== '')
	return [...new Set(tags)]
}

async function syncTagsFor(
	ctx: Context,
	tags: string[],
	id: string,
	type: TagMapType
): Promise<void> {
	const foundTags = await ctx.db
		.selectFrom(['tags', 'tag_maps'])
		.select('tags.slug')
		.where('tag_maps.id_item', '=', id)
		.whereRef('tags.id', '=', 'tag_maps.id_tag')
		.execute()

	const existingSlugs = foundTags.map((tag) => tag.slug)
	const addTags = differenceWith(tags, existingSlugs, (tag, slug) => slugify(tag) === slug)
	const removeTagSlugs = differenceWith(existingSlugs, tags, (slug, tag) => slug === slugify(tag))

	if (addTags.length) {
		await _private.addTagsTo(ctx, addTags, id, type)
	}

	if (removeTagSlugs.length) {
		await _private.removeTagsFrom(ctx, removeTagSlugs, id, type)
	}
}

async function addTagsTo(
	ctx: Context,
	tags: string[],
	id: string,
	type: TagMapType
): Promise<void> {
	for (const tag of tags) {
		const slug = slugify(tag)

		const tagDb = await ctx.db
			.insertInto('tags')
			.values({ slug, name: tag, id: createId() })
			.onConflict((oc) => oc.column('slug').doUpdateSet({ name: tag }))
			.returning('id')
			.executeTakeFirstOrThrow()

		await ctx.db.insertInto('tag_maps').values({ id_item: id, id_tag: tagDb.id, type }).execute()
	}
}

async function removeTagsFrom(
	ctx: Context,
	tagSlugs: string[],
	id: string,
	type: TagMapType
): Promise<void> {
	const findTags = await ctx.db
		.selectFrom('tags')
		.select('id')
		.where('slug', 'in', tagSlugs)
		.execute()

	await ctx.db
		.deleteFrom('tag_maps')
		.where('id_item', '=', id)
		.where('type', '=', type)
		.where(
			'id_tag',
			'in',
			findTags.map((tag) => tag.id)
		)
		.execute()

	const tagCounts = await ctx.db
		.selectFrom('tag_maps')
		.select([ctx.db.fn.count<number>('id_item').as('item_count'), 'id_tag'])
		.groupBy('id_tag')
		.where(
			'id_tag',
			'in',
			findTags.map((tag) => tag.id)
		)
		.execute()

	await ctx.db
		.deleteFrom('tags')
		.where(
			'id',
			'in',
			tagCounts.filter((tag) => tag.item_count === 0).map((tag) => tag.id_tag)
		)
		.execute()
}

async function removeAllTagsFrom(ctx: Context, ids: string[], type: TagMapType): Promise<void> {
	await ctx.db.deleteFrom('tag_maps').where('id_item', 'in', ids).where('type', '=', type).execute()

	const tagCounts = await ctx.db
		.selectFrom('tag_maps')
		.select([ctx.db.fn.count<number>('id_item').as('item_count'), 'id_tag'])
		.groupBy(['id_tag', 'id_item'])
		.where('id_item', 'in', ids)
		.execute()

	await ctx.db
		.deleteFrom('tags')
		.where(
			'id',
			'in',
			tagCounts.filter((tag) => tag.item_count === 0).map((tag) => tag.id_tag)
		)
		.execute()
}

const _private = {
	addTagsTo,
	removeTagsFrom,
}

export { addTagsTo, removeTagsFrom, syncTagsFor, removeAllTagsFrom, keywordsToTags, _private }
