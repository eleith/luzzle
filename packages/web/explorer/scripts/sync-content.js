import { loadConfig } from '@luzzle/web.utils/server'
import { copyFile } from 'fs/promises'
import path from 'path'

async function syncContent() {
	const userConfigPath = './config.yaml'
	const config = loadConfig(userConfigPath)

	const outDir = path.resolve(process.cwd(), `src/lib/content/components/custom`)
	const contents = Object.entries(config.content?.component || {})

	const syncPromises = contents.map(async ([name, sourcePath]) => {
		const source = path.resolve(process.cwd(), sourcePath)
		const destination = path.resolve(outDir, `${name}.svelte`)

		try {
			await copyFile(source, destination)
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
