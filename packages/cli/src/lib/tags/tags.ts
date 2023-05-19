import { differenceWith } from 'lodash'
import { Context } from '../commands/utils/types'
import slugify from '@sindresorhus/slugify'

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
  const findTagMaps = await ctx.prisma.tagMap.findMany({
    where: {
      id_item: id,
      type,
    },
  })

  const findTags = await ctx.prisma.tag.findMany({
    where: {
      id: {
        in: findTagMaps.map((tagMap) => tagMap.id_tag),
      },
    },
  })

  const existingSlugs = findTags.map((tag) => tag.slug)
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

    const tagDb = await ctx.prisma.tag.upsert({
      create: {
        slug,
        name: tag,
      },
      update: {},
      where: {
        slug,
      },
    })

    await ctx.prisma.tagMap.create({
      data: {
        id_item: id,
        id_tag: tagDb.id,
        type,
      },
    })
  }
}

async function removeTagsFrom(
  ctx: Context,
  tagSlugs: string[],
  id: string,
  type: TagMapType
): Promise<void> {
  const findTags = await ctx.prisma.tag.findMany({
    where: {
      slug: {
        in: tagSlugs,
      },
    },
  })

  await ctx.prisma.tagMap.deleteMany({
    where: {
      id_item: id,
      type,
      id_tag: {
        in: findTags.map((tag) => tag.id),
      },
    },
  })

  const tagCounts = await ctx.prisma.tagMap.groupBy({
    by: ['id_tag'],
    _count: true,
    where: {
      id_tag: {
        in: findTags.map((tag) => tag.id),
      },
    },
  })

  await ctx.prisma.tag.deleteMany({
    where: {
      id: {
        in: tagCounts.filter((tag) => tag._count === 0).map((tag) => tag.id_tag),
      },
    },
  })
}

async function removeAllTagsFrom(ctx: Context, ids: string[], type: TagMapType): Promise<void> {
  await ctx.prisma.tagMap.deleteMany({
    where: {
      id_item: {
        in: ids,
      },
      type,
    },
  })

  const tagCounts = await ctx.prisma.tagMap.groupBy({
    by: ['id_tag', 'id_item'],
    _count: true,
    where: {
      id_item: {
        in: ids,
      },
    },
  })

  await ctx.prisma.tag.deleteMany({
    where: {
      id: {
        in: tagCounts.filter((tag) => tag._count === 0).map((tag) => tag.id_tag),
      },
    },
  })
}

const _private = {
  addTagsTo,
  removeTagsFrom,
}

export { addTagsTo, removeTagsFrom, syncTagsFor, removeAllTagsFrom, keywordsToTags, _private }
