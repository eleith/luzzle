import { existsSync } from 'fs'
import path, { ParsedPath } from 'path'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import * as helpers from './helpers.js'

vi.mock('path')
vi.mock('fs')

const mocks = {
  existsSync: vi.mocked(existsSync),
  pathParse: vi.spyOn(path, 'parse'),
}

const spies: SpyInstance[] = []

describe('lib/commands/helpers', () => {
  afterEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset()
    })

    spies.forEach((spy) => {
      spy.mockRestore()
    })
  })

  test('parseSlugFromPath', async () => {
    const slug = 'slug'
    const file = `/asdf/asdf/books/${slug}.md`

    mocks.existsSync.mockReturnValue(true)
    mocks.pathParse.mockReturnValue({ name: slug } as ParsedPath)

    const findSlug = helpers.parseSlugFromPath(file)

    expect(mocks.existsSync).toHaveBeenCalledOnce()
    expect(mocks.pathParse).toHaveBeenCalledOnce()
    expect(findSlug).toBe(slug)
  })

  test('parseSlugFromPath returns null when not in path', async () => {
    const slug = 'slug'
    const file = `/asdf/asdf/${slug}.md`

    mocks.existsSync.mockReturnValue(true)
    mocks.pathParse.mockReturnValue({ name: slug } as ParsedPath)

    const findSlug = helpers.parseSlugFromPath(file)

    expect(mocks.existsSync).toHaveBeenCalledOnce()
    expect(findSlug).toBe(null)
  })

  test('parseSlugFromPath returns null when not a md file', async () => {
    const slug = 'slug'
    const file = `/asdf/asdf/${slug}.txt`

    mocks.existsSync.mockReturnValue(true)
    mocks.pathParse.mockReturnValue({ name: slug } as ParsedPath)

    const findSlug = helpers.parseSlugFromPath(file)

    expect(mocks.existsSync).toHaveBeenCalledOnce()
    expect(findSlug).toBe(null)
  })
})
