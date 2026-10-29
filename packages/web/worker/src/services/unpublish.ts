import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { WorkerContext } from './context.js'
import { getRcloneRemoteOptions } from './rclone.js'
import { isMissingFile, resolveGeneratedAssetFile } from '../assets/files.js'
import { cachePurgeStep } from '../steps/cache-purge.js'

async function findAssetDeletionCandidates(
	filePath: string,
	db: WorkerContext['db']
): Promise<string[]> {
	const assets = await db
		.selectFrom('web_pieces_assets')
		.select(['asset_path', 'is_embedded'])
		.where('piece_file_path', '=', filePath)
		.orderBy('asset_path')
		.execute()
	const paths = new Set<string>()
	for (const asset of assets) {
		if (asset.is_embedded) continue
		if (!asset.asset_path) continue
		paths.add(asset.asset_path)
	}
	if (paths.size === 0) return []

	const shared = await db
		.selectFrom('web_pieces_assets as asset')
		.innerJoin('web_pieces as piece', 'piece.file_path', 'asset.piece_file_path')
		.select('asset.asset_path')
		.where('piece.file_path', '!=', filePath)
		.where('asset.asset_path', 'in', [...paths])
		.execute()
	const sharedPaths = new Set(shared.map((asset) => asset.asset_path))
	return [...paths].filter((assetPath) => !sharedPaths.has(assetPath))
}

export async function unpublishPiece(filePath: string, ctx: WorkerContext): Promise<void> {
	if (typeof filePath !== 'string' || filePath.length === 0) {
		throw new Error('Unpublish requires a filePath')
	}
	const { db, config, logger, rclone } = ctx
	const piece = await db
		.selectFrom('web_pieces')
		.select('id')
		.where('file_path', '=', filePath)
		.executeTakeFirst()
	if (!piece) throw new Error(`No published piece found: ${filePath}`)

	const assetPaths = await findAssetDeletionCandidates(filePath, db)
	const files: { assetPath: string; localPath: string }[] = []
	for (const assetPath of assetPaths) {
		const localPath = await resolveGeneratedAssetFile(config.paths.assets, assetPath)
		files.push({ assetPath, localPath })
	}
	const remote = getRcloneRemoteOptions(config.sync, 'cdn')
	if (files.length > 0 && remote) {
		if (!remote.remote) throw new Error('Remote asset path is configured without a remote name')
		if (!remote.remotePath) throw new Error('Remote asset name is configured without a path')
		if (!remote.configPath) throw new Error('Remote asset deletion requires rclone configuration')
	}

	logger.info('unpublish targets selected', { filePath, assetPaths })
	await db.deleteFrom('web_pieces').where('id', '=', piece.id).execute()
	logger.info('unpublish public record removed', { filePath })

	const failures: string[] = []
	function recordFailure(target: string, error: unknown) {
		let message = String(error)
		if (error instanceof Error) message = error.message
		failures.push(`${target}: ${message}`)
		logger.error('unpublish cleanup failed', { filePath, target, error: message })
	}

	try {
		await cachePurgeStep.run(undefined, ctx)
	} catch (error) {
		recordFailure(`cache ${config.paths.cache}`, error)
	}

	for (const file of files) {
		try {
			await fs.unlink(file.localPath)
		} catch (error) {
			if (!isMissingFile(error)) recordFailure(`local ${file.localPath}`, error)
		}
		if (!remote) continue
		const remotePath = path.posix.join(remote.remotePath, file.assetPath)
		try {
			await rclone.deleteFile({ ...remote, remotePath })
		} catch (error) {
			recordFailure(`remote ${remote.remote}:${remotePath}`, error)
		}
	}

	if (failures.length > 0) {
		throw new Error(`Unpublish cleanup incomplete for ${filePath}:\n${failures.join('\n')}`)
	}
}
