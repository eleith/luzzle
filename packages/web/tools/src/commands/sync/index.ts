import path from 'path'
import {
	Pieces,
	selectItemAssets,
	getFrontmatterValue,
	getFrontmatterValues,
	LuzzleSelectable,
} from '@luzzle/core'
import { getStorage } from '../../lib/storage.js'
import { getDatabase, getDatabaseAndMigrate } from '../../lib/database.js'
import {
	type Config,
	type WebPieces,
	type WebPieceTags,
	type WebPiecesAsset,
} from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import runWebMigrations from '../../database/migrations.js'
import { cleanupAllTransforms } from '../../lib/transforms/index.js'
import { runTransformsForPiece } from '../../lib/transforms/runner.js'
import { sanitizeMetadata } from '../backfill/index.js'

type SyncOptions = {
	archiveDir?: string
	outDir: string
	dryRun?: boolean
	force?: boolean
	prune?: boolean
}

function slugify(text: string): string {
	return text
		.toString()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]+/g, '')
		.replace(/--+/g, '-')
}

function generateUniqueSlug(usedSlugs: Set<string>, filename: string): string {
	const base = slugify(filename)
	let candidate = base
	let n = 1
	while (usedSlugs.has(candidate)) {
		candidate = `${base}--${n}`
		n++
	}
	usedSlugs.add(candidate)
	return candidate
}

function buildWebPiece(
	item: LuzzleSelectable<'pieces_items'>,
	pieceConfig: Config['pieces'][number],
	slug: string,
	salt: string,
	frontmatter: ReturnType<typeof JSON.parse>,
	keywords: string[]
): WebPieces {
	const title = getFrontmatterValue<string>(frontmatter, pieceConfig.fields.title) || ''
	const dateConsumed = getFrontmatterValue<number>(frontmatter, pieceConfig.fields.date_consumed)
	const key = generateAssetKey(item.file_path, salt)

	const summary = pieceConfig.fields.summary
		? getFrontmatterValue<string>(frontmatter, pieceConfig.fields.summary)
		: undefined

	return {
		slug,
		type: item.type as WebPieces['type'],
		id: item.id,
		key,
		file_path: item.file_path,
		title,
		summary,
		note: item.note_markdown,
		keywords: keywords.length > 0 ? JSON.stringify(keywords) : undefined,
		date_added: item.date_added,
		date_consumed: dateConsumed,
		json_metadata: item.frontmatter_json,
		...(item.date_updated && { date_updated: item.date_updated }),
	}
}

async function syncWebPiece(
	db: ReturnType<typeof getDatabase>,
	file: string,
	action: 'added' | 'updated',
	config: Config,
	usedSlugs: Set<string>,
	slugByFilePath: Map<string, string>,
	dryRun: boolean,
	outDir: string,
	pieces: Pieces
): Promise<void> {
	const webDb = db.withTables<{
		web_pieces: WebPieces
		web_pieces_tags: WebPieceTags
		web_pieces_assets: WebPiecesAsset
	}>()

	const item = await db
		.selectFrom('pieces_items')
		.selectAll()
		.where('file_path', '=', file)
		.executeTakeFirst()
	if (!item) return

	const pieceConfig = config.pieces.find((p) => p.type === item.type)
	if (!pieceConfig) return

	let slug: string
	if (action === 'updated' && slugByFilePath.has(file)) {
		slug = slugByFilePath.get(file)!
	} else {
		const filename = path.basename(file, '.md').split('.')[0]
		slug = generateUniqueSlug(usedSlugs, filename)
		slugByFilePath.set(file, slug)
	}

	const frontmatter = JSON.parse(item.frontmatter_json)
	const keywords = pieceConfig.fields.tags
		? getFrontmatterValues<string>(frontmatter, pieceConfig.fields.tags).flat().filter(Boolean)
		: []

	const assetPaths: string[] = JSON.parse(item.assets_json_array || '[]')
	const pathToKey = new Map<string, string>()
	const keyToPath = new Map<string, string>()

	for (const p of assetPaths) {
		const key = generateAssetKey(p, config.assets.salt)
		pathToKey.set(p, key)
		keyToPath.set(key, p)
	}

	const sanitizedItem = { ...item, frontmatter_json: sanitizeMetadata(item.frontmatter_json, pathToKey) }
	const webPiece = buildWebPiece(sanitizedItem, pieceConfig, slug, config.assets.salt, frontmatter, keywords)

	if (!dryRun) {
		await webDb
			.insertInto('web_pieces')
			.values(webPiece)
			.onConflict((oc) =>
				oc.column('id').doUpdateSet({
					title: webPiece.title,
					summary: webPiece.summary,
					note: webPiece.note,
					keywords: webPiece.keywords,
					json_metadata: webPiece.json_metadata,
					date_updated: webPiece.date_updated,
					date_consumed: webPiece.date_consumed,
				})
			)
			.execute()

		await webDb.deleteFrom('web_pieces_tags').where('piece_id', '=', item.id).execute()

		if (keywords.length > 0) {
			const tags: WebPieceTags[] = keywords.map((tag) => ({
				piece_slug: slug,
				piece_type: item.type,
				piece_id: item.id,
				tag: tag.trim(),
				slug: slugify(tag.trim()),
			}))
			await webDb.insertInto('web_pieces_tags').values(tags).execute()
		}

		await runTransformsForPiece(db, webPiece, config, outDir, pieces, {}, keyToPath)
	}
}

async function pruneWebPiece(
	db: ReturnType<typeof getDatabase>,
	file: string,
	dryRun: boolean
): Promise<void> {
	const webDb = db.withTables<{
		web_pieces: WebPieces
		web_pieces_tags: WebPieceTags
		web_pieces_assets: WebPiecesAsset
	}>()

	if (!dryRun) {
		await webDb.deleteFrom('web_pieces').where('file_path', '=', file).execute()
	}
}

async function syncSchemas(
	db: ReturnType<typeof getDatabase>,
	pieces: Pieces,
	options: Pick<SyncOptions, 'dryRun' | 'force'>
) {
	const { dryRun = false, force = false } = options
	const sync = await pieces.sync(db, { dryRun, force })

	for await (const result of sync) {
		if (result.error) {
			console.error(`[error] syncing schema ${result.name}: ${result.message}`)
		} else if (result.action !== 'skipped') {
			console.log(`[${result.action}] schema: ${result.name}`)
		}
	}

	const prune = await pieces.prune(db, { dryRun })
	for await (const result of prune) {
		if (result.error) {
			console.error(`[error] pruning schema ${result.name}: ${result.message}`)
		} else if (result.action === 'pruned') {
			console.log(`[${result.action}] schema: ${result.name}`)
		}
	}
}

async function syncPieces(
	db: ReturnType<typeof getDatabase>,
	pieces: Pieces,
	storage: ReturnType<typeof getStorage>,
	files: Awaited<ReturnType<Pieces['getFilesIn']>>,
	options: Pick<SyncOptions, 'dryRun' | 'force' | 'prune' | 'outDir'>,
	config: Config
) {
	const { dryRun = false, force = false, prune = false } = options
	const webDb = db.withTables<{
		web_pieces: WebPieces
		web_pieces_tags: WebPieceTags
		web_pieces_assets: WebPiecesAsset
	}>()

	for (const name of files.types) {
		const piece = await pieces.getPiece(name)
		const piecesOnDisk = files.pieces.filter((one) => pieces.parseFilename(one).type === name)

		let processFiles = piecesOnDisk
		if (!force) {
			const isOutdated = await Promise.all(piecesOnDisk.map((file) => piece.isOutdated(file, db)))
			processFiles = piecesOnDisk.filter((_, i) => isOutdated[i])
		}

		// Preload existing web_pieces slugs for this type to ensure uniqueness
		const existingPiecesForType = await webDb
			.selectFrom('web_pieces')
			.select(['slug', 'file_path', 'id'])
			.where('type', '=', name)
			.execute()
		const usedSlugs = new Set<string>(existingPiecesForType.map((p) => p.slug))
		const slugByFilePath = new Map<string, string>(
			existingPiecesForType.map((p) => [p.file_path, p.slug])
		)

		const syncItems = await piece.sync(db, processFiles, { dryRun, force })
		for await (const result of syncItems) {
			if (result.error) {
				console.error(`[error] syncing item ${result.file}: ${result.message}`)
			} else {
				if (result.action !== 'skipped') {
					console.log(`[${result.action}] item: ${result.file}`)
				}
				if (result.action === 'added' || result.action === 'updated') {
					await syncWebPiece(
						db,
						result.file,
						result.action,
						config,
						usedSlugs,
						slugByFilePath,
						dryRun,
						options.outDir,
						pieces
					)
				}
			}
		}

		const pruneItems = await piece.prune(db, piecesOnDisk, { dryRun })
		for await (const result of pruneItems) {
			if (result.error) {
				console.error(`[error] pruning item ${result.file}: ${result.message}`)
			} else if (result.action === 'pruned') {
				console.log(`[${result.action}] item: ${result.file}`)
				await pruneWebPiece(db, result.file, dryRun)
			}
		}
	}

	if (prune) {
		await pruneAssets(db, storage, files, dryRun)
	}

	await cleanupAllTransforms()
}

async function pruneAssets(
	db: ReturnType<typeof getDatabase>,
	storage: ReturnType<typeof getStorage>,
	files: Awaited<ReturnType<Pieces['getFilesIn']>>,
	dryRun: boolean
) {
	const dbAssets = await selectItemAssets(db)
	const dbAssetsSet = new Set<string>(dbAssets)
	const missingAssets = files.assets.filter((asset) => !dbAssetsSet.has(asset))

	for (const asset of missingAssets) {
		if (!dryRun) {
			await storage.delete(asset)
		}
		console.log(`[pruned] asset: ${asset}`)
	}
}

export default async function sync(options: SyncOptions, config: Config) {
	const storage = getStorage(config, options.archiveDir)
	const db = await getDatabaseAndMigrate(config)
	const pieces = new Pieces(storage)
	const dryRun = options.dryRun || false
	const force = options.force || false
	const prune = options.prune || false
	const outDir = options.outDir

	const webMigrationResult = await runWebMigrations(db)
	if (webMigrationResult.error) {
		throw new Error(`Web migration failed: ${webMigrationResult.error}`)
	}

	const files = await pieces.getFilesIn('.', { deep: true })

	await syncSchemas(db, pieces, { dryRun, force })
	await syncPieces(db, pieces, storage, files, { dryRun, force, prune, outDir }, config)
}
