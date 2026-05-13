import { loadConfig } from '@luzzle/web.config/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'

async function syncContent() {
	const userConfigPath = './config.yaml'
	const config = loadConfig(userConfigPath)

	const outDir = path.resolve(process.cwd(), `src/lib/content/components/custom`)
	const contents = Object.entries(config.content?.component || {})

	await mkdir(outDir, { recursive: true })

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
