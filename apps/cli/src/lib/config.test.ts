import { afterEach, beforeEach, expect, test } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'
import { StorageFileSystem } from '@luzzle/core'
import { getConfig, getDatabasePath, getStorage, withDefaults } from './config.js'

let directory: string
let configPath: string

beforeEach(async () => {
	const cache = fileURLToPath(new URL('../../node_modules/.cache/', import.meta.url))
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'cli-config-'))
	configPath = path.join(directory, 'config.yaml')
})

afterEach(async () => {
	await rm(directory, { recursive: true, force: true })
})

test('database and storage defaults use the selected configuration directory', () => {
	const config = getConfig(configPath)
	expect(config.path).toBe(configPath)
	expect(getDatabasePath(config)).toBe(path.join(directory, 'luzzle.sqlite'))
	const storage = getStorage(config)
	expect(storage).toBeInstanceOf(StorageFileSystem)
	expect(storage.root).toBe(directory)
})

test('configured database and archive paths survive reopening the configuration', async () => {
	const archive = path.join(directory, 'archive')
	const database = path.join(directory, 'custom.sqlite')
	await mkdir(archive)
	const config = getConfig(configPath)
	config.set('storage', { type: 'filesystem', root: archive })
	config.set('database', { type: 'sqlite', path: database })

	const reopened = getConfig(configPath)
	expect(getDatabasePath(reopened)).toBe(database)
	expect(getStorage(reopened).root).toBe(archive)
})

test('assistant model persists, appears in settings, and can be cleared without storing a default', async () => {
	const config = getConfig(configPath)
	expect(config.get('ai.model')).toBeUndefined()
	expect(config.store).not.toHaveProperty('ai')
	expect(withDefaults(config)).not.toHaveProperty('ai')

	const model = 'custom-model'
	config.set('ai.model', model)
	const reopened = getConfig(configPath)
	expect(YAML.parse(await readFile(configPath, 'utf8'))).toEqual({ ai: { model } })
	expect(reopened.get('ai.model')).toBe(model)
	expect(withDefaults(reopened)).toHaveProperty('ai', { model })

	reopened.set('ai.model', '')
	const blank = getConfig(configPath)
	expect(blank.get('ai.model')).toBe('')
	expect(withDefaults(blank)).toHaveProperty('ai', { model: '' })

	blank.delete('ai.model')
	const removed = getConfig(configPath)
	expect(removed.get('ai.model')).toBeUndefined()
	expect(withDefaults(removed)).not.toHaveProperty('ai')
})

test('the assistant model must be a string', async () => {
	await writeFile(configPath, 'ai:\n  model: 42\n')
	expect(() => getConfig(configPath)).toThrow()
})
