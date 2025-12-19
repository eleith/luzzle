import { loadConfig } from '@luzzle/web.utils/server'
import { copyFile, mkdir } from 'fs/promises'
import path from 'path'

async function syncContent() {
	console.log('Syncing piece custom components...')

	const userConfigPath = './config.yaml'
	const config = loadConfig(userConfigPath)
	const outDir = path.resolve(process.cwd(), 'src/lib/pieces/components/custom')
	const syncPieceComponentPromises = []

	config.pieces.forEach(async (piece) => {
		const components = ['page', 'icon', 'opengraph']

		components.forEach((component) => {
			const sourcePath = piece.components?.[component]

			if (sourcePath) {
				const source = path.resolve(process.cwd(), sourcePath)
				const destinationDir = path.resolve(outDir, `${piece.type}`)
				const destination = path.join(destinationDir, `${component}.svelte`)

				const syncPromise = mkdir(destinationDir, { recursive: true })
					.then(() => copyFile(source, destination))
					.then(() => console.log(`Synced ${sourcePath} -> ${destination}`))
					.catch((error) => {
						console.error(`Error syncing ${sourcePath}:`, error)
						throw error
					})
				syncPieceComponentPromises.push(syncPromise)
			}
		})
	})

	await Promise.all(syncPieceComponentPromises)
	console.log('Piece custom component sync complete.')
}

syncContent().catch((error) => {
	console.error('Piece custom components sync failed:', error)
	process.exit(1)
})
