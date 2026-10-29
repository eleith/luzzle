import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { sql } from 'kysely'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { WorkerContext } from './context.js'
import type { AppDatabase } from './db.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { makeLogger } from '../../test/logger.js'
import { cachePurgeStep } from '../steps/cache-purge.js'
import { unpublishPiece } from './unpublish.js'

const filePath = 'books/withdraw.books.md'
const otherPiece = 'books/keep.books.md'
let directory: string
let ctx: WorkerContext
let deleteFile: ReturnType<typeof vi.fn>

beforeEach(async () => {
	directory = await fs.mkdtemp(path.join(tmpdir(), 'luzzle-unpublish-'))
	const assets = path.join(directory, 'assets')
	const cache = path.join(directory, 'cache')
	const archive = path.join(directory, 'archive')
	for (const folder of [assets, cache, archive]) await fs.mkdir(folder)
	deleteFile = vi.fn().mockResolvedValue(undefined)
	ctx = {
		db: (await setupDatabase()).withTables<AppDatabase>(),
		config: {
			paths: { assets, cache },
			storage: { root: archive },
			sync: {
				config: '/config/rclone.conf',
				cdn: { remote: 'cdn', path: 'published/', strategy: 'copy', flags: ['--no-traverse'] },
			},
		} as WorkerContext['config'],
		logger: makeLogger(),
		rclone: { deleteFile, sync: vi.fn(), copy: vi.fn() } as unknown as WorkerContext['rclone'],
	}
	await seedPiece(filePath, 'Withdrawn')
})

afterEach(async () => {
	vi.restoreAllMocks()
	await teardownDatabase(ctx.db)
	await fs.rm(directory, { recursive: true, force: true })
})

async function seedPiece(file: string, title: string) {
	await ctx.db
		.insertInto('pieces_items')
		.values({
			id: file,
			file_path: file,
			type: 'books',
			date_added: 1,
			frontmatter_json: '{}',
			note_markdown: 'source note',
		})
		.execute()
	await ctx.db
		.insertInto('pieces_cache')
		.values({ id: file, file_path: file, content_hash: 'source-hash' })
		.execute()
	await ctx.db
		.insertInto('web_pieces')
		.values({
			id: file,
			file_path: file,
			key: file,
			slug: file,
			type: 'books',
			title,
			date_added: 1,
			json_metadata: '{}',
		})
		.execute()
}

async function recordAsset(
	file: string,
	assetPath: string | null,
	transformation = 'image.original',
	isEmbedded: 0 | 1 = 0
) {
	await ctx.db
		.insertInto('web_pieces_assets')
		.values({
			piece_file_path: file,
			piece_key: file,
			piece_asset_path: assetPath,
			asset_key: 'asset',
			asset_path: assetPath,
			transformation,
			mime_type: 'image/png',
			is_embedded: isEmbedded,
		})
		.execute()
}

async function writeAsset(assetPath: string) {
	const target = path.join(ctx.config.paths.assets, assetPath)
	await fs.mkdir(path.dirname(target), { recursive: true })
	await fs.writeFile(target, 'generated')
	return target
}

function published() {
	return ctx.db
		.selectFrom('web_pieces')
		.select('file_path')
		.where('file_path', '=', filePath)
		.executeTakeFirst()
}

test('withdraws only the target public piece and its recorded unshared files', async () => {
	await seedPiece(otherPiece, 'Retained')
	const cover = await writeAsset('books/target/cover.png')
	const shared = await writeAsset('books/shared.png')
	const unrecorded = await writeAsset('books/target/unrecorded.png')
	const inline = await writeAsset('books/target/inline.png')
	await recordAsset(filePath, 'books/target/cover.png')
	await recordAsset(filePath, 'books/target/cover.png', 'image.s.png')
	await recordAsset(filePath, 'books/shared.png')
	await recordAsset(otherPiece, 'books/shared.png')
	await recordAsset(filePath, null, 'markdown')
	await recordAsset(filePath, 'books/target/inline.png', 'inline', 1)
	await ctx.db
		.insertInto('web_pieces_tags')
		.values({
			piece_id: filePath,
			piece_slug: filePath,
			piece_type: 'books',
			tag: 'test',
			slug: 'test',
		})
		.execute()
	const source = path.join(ctx.config.storage.root, 'source.md')
	const original = path.join(ctx.config.storage.root, 'original.png')
	await fs.writeFile(source, 'original Markdown')
	await fs.writeFile(original, 'original attachment')
	await fs.writeFile(path.join(ctx.config.paths.cache, 'page'), 'cached page')
	const searchBefore = await sql`
		SELECT file_path FROM web_pieces_fts5 WHERE web_pieces_fts5 MATCH 'Withdrawn'
	`.execute(ctx.db)
	expect(searchBefore.rows).toHaveLength(1)

	await unpublishPiece(filePath, ctx)

	expect(await published()).toBeUndefined()
	const searchAfter = await sql`
		SELECT file_path FROM web_pieces_fts5 WHERE web_pieces_fts5 MATCH 'Withdrawn'
	`.execute(ctx.db)
	expect(searchAfter.rows).toHaveLength(0)
	expect(await ctx.db.selectFrom('web_pieces_tags').selectAll().execute()).toEqual([])
	expect(await ctx.db.selectFrom('web_pieces_assets').selectAll().execute()).toMatchObject([
		{ piece_file_path: otherPiece, asset_path: 'books/shared.png' },
	])
	expect(await ctx.db.selectFrom('web_pieces').select('file_path').execute()).toEqual([
		{ file_path: otherPiece },
	])
	expect(await ctx.db.selectFrom('pieces_items').selectAll().execute()).toHaveLength(2)
	expect(await ctx.db.selectFrom('pieces_cache').selectAll().execute()).toHaveLength(2)
	await expect(fs.readFile(cover)).rejects.toMatchObject({ code: 'ENOENT' })
	for (const retained of [shared, unrecorded, inline]) {
		expect(await fs.readFile(retained, 'utf8')).toBe('generated')
	}
	expect(await fs.readFile(source, 'utf8')).toBe('original Markdown')
	expect(await fs.readFile(original, 'utf8')).toBe('original attachment')
	expect(await fs.readdir(ctx.config.paths.cache)).toEqual([])
	expect(deleteFile).toHaveBeenCalledExactlyOnceWith({
		remote: 'cdn',
		remotePath: 'published/books/target/cover.png',
		configPath: '/config/rclone.conf',
		flags: ['--no-traverse'],
	})
	expect(ctx.rclone.sync).not.toHaveBeenCalled()
	expect(ctx.rclone.copy).not.toHaveBeenCalled()
})

test('attempts remote deletion when the local file is already absent', async () => {
	await recordAsset(filePath, 'books/target/missing.png')
	await unpublishPiece(filePath, ctx)
	expect(deleteFile).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ remotePath: 'published/books/target/missing.png' })
	)
})

test('works without a remote and without generated files', async () => {
	ctx.config.sync.cdn.remote = ''
	ctx.config.sync.cdn.path = ''
	await unpublishPiece(filePath, ctx)
	expect(await published()).toBeUndefined()
	expect(deleteFile).not.toHaveBeenCalled()
})

test('deletes local files when no remote is configured', async () => {
	ctx.config.sync.cdn.remote = ''
	ctx.config.sync.cdn.path = ''
	const target = await writeAsset('books/target/local.png')
	await recordAsset(filePath, 'books/target/local.png')
	await unpublishPiece(filePath, ctx)
	await expect(fs.readFile(target)).rejects.toMatchObject({ code: 'ENOENT' })
	expect(deleteFile).not.toHaveBeenCalled()
})

test('reports cleanup failures but attempts remaining local and remote files', async () => {
	const first = await writeAsset('books/target/a.png')
	const second = await writeAsset('books/target/b.png')
	await recordAsset(filePath, 'books/target/a.png')
	await recordAsset(filePath, 'books/target/b.png')
	vi.spyOn(cachePurgeStep, 'run').mockRejectedValueOnce(new Error('cache unavailable'))
	const unlink = fs.unlink
	vi.spyOn(fs, 'unlink').mockImplementation(async (target) => {
		if (target === first) throw new Error('local deletion refused')
		return unlink(target)
	})
	deleteFile.mockRejectedValueOnce(new Error('remote deletion refused'))

	await expect(unpublishPiece(filePath, ctx)).rejects.toThrow('Unpublish cleanup incomplete')

	expect(await published()).toBeUndefined()
	expect(await fs.readFile(first, 'utf8')).toBe('generated')
	await expect(fs.readFile(second)).rejects.toMatchObject({ code: 'ENOENT' })
	expect(deleteFile).toHaveBeenCalledTimes(2)
	expect(deleteFile).toHaveBeenNthCalledWith(
		2,
		expect.objectContaining({ remotePath: 'published/books/target/b.png' })
	)
	for (const error of ['cache unavailable', 'local deletion refused', 'remote deletion refused']) {
		expect(ctx.logger.error).toHaveBeenCalledWith(
			'unpublish cleanup failed',
			expect.objectContaining({ filePath, error })
		)
	}
})

test('validates recorded paths before withdrawing the public record', async () => {
	await recordAsset(filePath, '../outside.png')
	await expect(unpublishPiece(filePath, ctx)).rejects.toThrow('asset path')
	expect(await published()).toBeDefined()
	expect(deleteFile).not.toHaveBeenCalled()
})

test('does not withdraw the record when remote configuration is incomplete', async () => {
	await recordAsset(filePath, 'books/target/missing.png')
	ctx.config.sync.cdn.remote = ''
	await expect(unpublishPiece(filePath, ctx)).rejects.toThrow('without a remote name')
	expect(await published()).toBeDefined()
	expect(deleteFile).not.toHaveBeenCalled()
})

test('stops before cleanup if public-record deletion fails', async () => {
	const target = await writeAsset('books/target/cover.png')
	await recordAsset(filePath, 'books/target/cover.png')
	vi.spyOn(ctx.db, 'deleteFrom').mockImplementationOnce(() => {
		throw new Error('database refused deletion')
	})
	const purge = vi.spyOn(cachePurgeStep, 'run')
	await expect(unpublishPiece(filePath, ctx)).rejects.toThrow('database refused deletion')
	expect(await published()).toBeDefined()
	expect(await fs.readFile(target, 'utf8')).toBe('generated')
	expect(purge).not.toHaveBeenCalled()
	expect(deleteFile).not.toHaveBeenCalled()
})

test('reports an absent public record without claiming earlier cleanup succeeded', async () => {
	const purge = vi.spyOn(cachePurgeStep, 'run')
	await expect(unpublishPiece('books/missing.books.md', ctx)).rejects.toThrow(
		'No published piece found'
	)
	expect(await published()).toBeDefined()
	expect(purge).not.toHaveBeenCalled()
	expect(deleteFile).not.toHaveBeenCalled()
})
