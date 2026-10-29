import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { resolveGeneratedAssetFile } from './files.js'

let directory: string
let root: string

beforeEach(async () => {
	directory = await fs.mkdtemp(path.join(tmpdir(), 'luzzle-asset-files-'))
	root = path.join(directory, 'assets')
	await fs.mkdir(root)
})

afterEach(async () => {
	await fs.rm(directory, { recursive: true, force: true })
})

test('resolves a generated file under its configured root without changing it', async () => {
	await fs.mkdir(path.join(root, 'books'))
	const file = path.join(root, 'books/cover.png')
	await fs.writeFile(file, 'generated')
	expect(await resolveGeneratedAssetFile(root, 'books/cover.png')).toBe(file)
	expect(await fs.readFile(file, 'utf8')).toBe('generated')
})

test('allows a missing local file so callers can still handle its remote copy', async () => {
	expect(await resolveGeneratedAssetFile(root, 'books/missing.png')).toBe(
		path.join(root, 'books/missing.png')
	)
})

test.each(['../outside.png', '/outside.png'])(
	'rejects unsafe generated path %j',
	async (assetPath) => {
		await expect(resolveGeneratedAssetFile(root, assetPath)).rejects.toThrow('asset path')
	}
)

test('rejects symbolic links without following or changing their targets', async () => {
	const outside = path.join(directory, 'outside')
	await fs.mkdir(outside)
	await fs.writeFile(path.join(outside, 'keep.png'), 'keep')
	await fs.symlink(outside, path.join(root, 'linked'))
	await expect(resolveGeneratedAssetFile(root, 'linked/keep.png')).rejects.toThrow('symbolic link')
	expect(await fs.readFile(path.join(outside, 'keep.png'), 'utf8')).toBe('keep')
})

test('rejects directories where an asset file is expected', async () => {
	await fs.mkdir(path.join(root, 'directory'))
	await expect(resolveGeneratedAssetFile(root, 'directory')).rejects.toThrow('not a file')
	expect(await fs.readdir(path.join(root, 'directory'))).toEqual([])
})
