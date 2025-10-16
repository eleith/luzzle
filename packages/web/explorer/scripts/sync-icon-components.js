import { loadConfig } from '@luzzle/tools'
import { copyFile, mkdir } from 'fs/promises'
import path from 'path'

async function syncContent() {
	console.log('Syncing icon components...')

	const userConfigPath = './config.yaml'
	const config = loadConfig(userConfigPath)

	if (!config.content || !config.content.block) {
		console.log('No icon components found in config. Nothing to sync.')
		return
	}

	const outDir = path.resolve(process.cwd(), 'src/lib/pieces/components/icons')
	await mkdir(outDir, { recursive: true })

	const syncPromises = Object.entries(config.pieces).map(async ([, piece]) => {
		const sourcePath = piece.components?.icon
		const name = piece.type

		if (sourcePath) {
			const source = path.resolve(process.cwd(), sourcePath)
			const destinationDir = path.resolve(outDir, `${name}`)
			const destination = path.join(destinationDir, 'icon.svelte')

			try {
				await mkdir(destinationDir, { recursive: true })
				await copyFile(source, destination)
				console.log(`Synced ${sourcePath} -> ${destination}`)
			} catch (error) {
				console.error(`Error syncing ${sourcePath}:`, error)
				throw error
			}
		}
	})

	await Promise.all(syncPromises)
	console.log('Icon component sync complete.')
}

syncContent().catch((error) => {
	console.error('Icon component sync failed:', error)
	process.exit(1)
})
