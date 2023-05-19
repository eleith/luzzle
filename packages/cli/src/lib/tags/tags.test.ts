import log from '../log'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { makeContext } from '../commands/context.fixtures'
import * as tagLibrary from './tags'
import { Tag, TagMap } from '@luzzle/prisma'

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
}

const spies: SpyInstance[] = []

describe('lib/tags/tags.ts', () => {
  afterEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset()
    })

    spies.forEach((spy) => {
      spy.mockRestore()
    })
  })

  test('addTagsTo', async () => {
    const ctx = makeContext()
    const tags = ['one', 'two', 'three']
    const id = 'id1'
    const tagId = 'tagId1'
    const type = tagLibrary.TagMapTypes.BOOKS

    const spyPrismaUpsertTag = vi.spyOn(ctx.prisma.tag, 'upsert')
    const spyPrismaCreateTagMap = vi.spyOn(ctx.prisma.tagMap, 'create')

    spyPrismaUpsertTag.mockResolvedValue({ id: tagId } as Tag)
    spyPrismaCreateTagMap.mockResolvedValue({} as TagMap)

    spies.push(spyPrismaUpsertTag, spyPrismaCreateTagMap)

    await tagLibrary.addTagsTo(ctx, tags, id, type)

    expect(spyPrismaCreateTagMap).toHaveBeenCalledTimes(tags.length)
    expect(spyPrismaUpsertTag).toHaveBeenCalledTimes(tags.length)
  })

  test('removeTagsFrom', async () => {
    type TagMapGroupByType = typeof ctx.prisma.tagMap.groupBy

    const ctx = makeContext()
    const tagSlugs = ['one', 'two', 'three']
    const tags = tagSlugs.map((slug) => ({ slug, id: 'id' } as Tag))
    const tagCounts = tagSlugs.map((slug, i) => ({
      slug,
      id_tag: 'id',
      _count: i,
    })) as unknown as Awaited<ReturnType<TagMapGroupByType>>
    const id = 'id1'
    const type = tagLibrary.TagMapTypes.BOOKS

    const spyPrismaFindManyTag = vi.spyOn(ctx.prisma.tag, 'findMany')
    const spyPrismaGroupByTagMap = vi.spyOn(ctx.prisma.tagMap, 'groupBy') as SpyInstance<
      Parameters<TagMapGroupByType>,
      ReturnType<TagMapGroupByType>
    >
    const spyPrismaDeleteManyTagMap = vi.spyOn(ctx.prisma.tagMap, 'deleteMany')
    const spyPrismaDeleteManyTag = vi.spyOn(ctx.prisma.tag, 'deleteMany')

    spyPrismaFindManyTag.mockResolvedValue(tags)
    spyPrismaDeleteManyTagMap.mockResolvedValue({ count: tags.length })
    spyPrismaGroupByTagMap.mockResolvedValue(tagCounts)
    spyPrismaDeleteManyTag.mockResolvedValue({ count: tags.length })

    spies.push(
      spyPrismaFindManyTag,
      spyPrismaDeleteManyTagMap,
      spyPrismaGroupByTagMap,
      spyPrismaDeleteManyTag
    )

    await tagLibrary.removeTagsFrom(ctx, tagSlugs, id, type)

    expect(spyPrismaFindManyTag).toHaveBeenCalledTimes(1)
    expect(spyPrismaDeleteManyTagMap).toHaveBeenCalledTimes(1)
    expect(spyPrismaGroupByTagMap).toHaveBeenCalledTimes(1)
    expect(spyPrismaDeleteManyTag).toHaveBeenCalledTimes(1)
  })

  test('removeAllTagsFrom', async () => {
    type TagMapGroupByType = typeof ctx.prisma.tagMap.groupBy

    const ctx = makeContext()
    const tagSlugs = ['one', 'two', 'three']
    const tags = tagSlugs.map((slug) => ({ slug, id: 'id' } as Tag))
    const tagCounts = tagSlugs.map((slug, i) => ({
      slug,
      id_tag: 'id',
      _count: i,
    })) as unknown as Awaited<ReturnType<TagMapGroupByType>>
    const id = 'id1'
    const type = tagLibrary.TagMapTypes.BOOKS

    const spyPrismaGroupByTagMap = vi.spyOn(ctx.prisma.tagMap, 'groupBy') as SpyInstance<
      Parameters<TagMapGroupByType>,
      ReturnType<TagMapGroupByType>
    >
    const spyPrismaDeleteManyTagMap = vi.spyOn(ctx.prisma.tagMap, 'deleteMany')
    const spyPrismaDeleteManyTag = vi.spyOn(ctx.prisma.tag, 'deleteMany')

    spyPrismaDeleteManyTagMap.mockResolvedValue({ count: tags.length })
    spyPrismaGroupByTagMap.mockResolvedValue(tagCounts)
    spyPrismaDeleteManyTag.mockResolvedValue({ count: tags.length })

    spies.push(spyPrismaDeleteManyTagMap, spyPrismaGroupByTagMap, spyPrismaDeleteManyTag)

    await tagLibrary.removeAllTagsFrom(ctx, [id], type)

    expect(spyPrismaDeleteManyTagMap).toHaveBeenCalledTimes(1)
    expect(spyPrismaGroupByTagMap).toHaveBeenCalledTimes(1)
    expect(spyPrismaDeleteManyTag).toHaveBeenCalledTimes(1)
  })

  test('syncTagsFor', async () => {
    const ctx = makeContext()
    const tagNames = ['one', 'two', 'three']
    const tags = ['one', 'two', 'found'].map((slug) => ({ slug, id: 'id' } as Tag))
    const id = 'id1'
    const type = tagLibrary.TagMapTypes.BOOKS

    const spyPrismaFindManyTagMap = vi.spyOn(ctx.prisma.tagMap, 'findMany')
    const spyPrismaFindManyTag = vi.spyOn(ctx.prisma.tag, 'findMany')
    const spyAddTagsTo = vi.spyOn(tagLibrary._private, 'addTagsTo')
    const spyRemoveTagsFrom = vi.spyOn(tagLibrary._private, 'removeTagsFrom')

    spyPrismaFindManyTagMap.mockResolvedValueOnce([])
    spyPrismaFindManyTag.mockResolvedValueOnce(tags)
    spyAddTagsTo.mockResolvedValueOnce(undefined)
    spyRemoveTagsFrom.mockResolvedValueOnce(undefined)

    spies.push(spyPrismaFindManyTagMap, spyPrismaFindManyTag, spyAddTagsTo, spyRemoveTagsFrom)

    await tagLibrary.syncTagsFor(ctx, tagNames, id, type)

    expect(spyPrismaFindManyTagMap).toHaveBeenCalledTimes(1)
    expect(spyPrismaFindManyTag).toHaveBeenCalledTimes(1)
    expect(spyAddTagsTo).toHaveBeenCalledWith(ctx, ['three'], id, type)
    expect(spyAddTagsTo).toHaveBeenCalledTimes(1)
    expect(spyRemoveTagsFrom).toHaveBeenCalledWith(ctx, ['found'], id, type)
    expect(spyRemoveTagsFrom).toHaveBeenCalledTimes(1)
  })

  test('keywordsToTags', () => {
    const keywords = 'one,two,  two,three  '
    const tags = tagLibrary.keywordsToTags(keywords)

    expect(tags).toEqual(['one', 'two', 'three'])
  })
})
