import { loadConfig } from '@luzzle/web.templates/config'
import { readFile, writeFile, mkdir, realpath, rm } from 'fs/promises'
import path from 'path'

async function existingPath(filename) {
	try {
		return await realpath(filename)
	} catch (error) {
		if (error.code !== 'ENOENT') throw error
		return filename
	}
}

async function syncContent() {
	const userConfigPath = './config.yaml'
	const config = loadConfig(userConfigPath)

	const outDir = path.resolve(process.cwd(), `src/lib/content/components/custom`)
	const contents = Object.entries(config.content?.component || {}).filter(
		([name]) => name !== 'feed'
	)

	await mkdir(outDir, { recursive: true })

	const retiredFeedCopy = path.join(outDir, 'feed.svelte')
	const sourcePaths = [
		...Object.values(config.content?.component || {}),
		...config.pieces.flatMap((piece) => Object.values(piece.components || {}))
	].map((source) => path.resolve(process.cwd(), source))
	const configuredPaths = await Promise.all(sourcePaths.map(existingPath))
	const retiredPath = await existingPath(retiredFeedCopy)
	// Preserve configured sources, including file and parent-directory symlink aliases.
	if (!configuredPaths.includes(retiredPath)) {
		await rm(retiredFeedCopy, { force: true })
	}

	const syncPromises = contents.map(async ([name, sourcePath]) => {
		const source = path.resolve(process.cwd(), sourcePath)
		const destination = path.resolve(outDir, `${name}.svelte`)

		try {
			const data = await readFile(source)
			await writeFile(destination, data)
			console.log(`Synced ${sourcePath} -> ${destination}`)
		} catch (error) {
			console.error(`Error syncing ${sourcePath}:`, error)
			throw error
		}
	})

	await Promise.all(syncPromises)
}

syncContent().catch((error) => {
	console.error('Content sync failed:', error)
	process.exit(1)
})
