import { loadConfig } from '@luzzle/web.config'
import { copyFile, mkdir, readdir, unlink, rmdir, stat } from 'fs/promises'
import path from 'path'

const COMPONENTS = ['page', 'icon', 'opengraph']

// Walk `dir` and remove any file not in `keptPaths`. Removes now-empty directories
// on the way back up. We avoid rm -rf'ing the whole output up front because Vite's
// HMR debounces unlink+add into a no-op for files referenced via import.meta.glob;
// overwriting in place produces `change` events that invalidate correctly.
async function cleanOrphans(dir, keptPaths) {
	const dirExists = await stat(dir)
		.then((s) => s.isDirectory())
		.catch(() => false)
	if (!dirExists) return
	const entries = await readdir(dir, { withFileTypes: true })
	for (const entry of entries) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			await cleanOrphans(full, keptPaths)
			const remaining = await readdir(full).catch(() => [])
			if (remaining.length === 0) await rmdir(full).catch(() => {})
		} else if (!keptPaths.has(full)) {
			await unlink(full).catch(() => {})
		}
	}
}

async function syncContent() {
	console.log('Syncing piece custom components...')

	const config = loadConfig('./config.yaml')
	const outDir = path.resolve(process.cwd(), 'src/lib/pieces/components/custom')
	await mkdir(outDir, { recursive: true })

	const tasks = []
	const keptPaths = new Set()

	for (const piece of config.pieces) {
		for (const role of COMPONENTS) {
			const sourcePath = piece.components?.[role]
			if (!sourcePath) continue

			const source = path.resolve(process.cwd(), sourcePath)
			const destinationDir = path.join(outDir, piece.type)
			const destination = path.join(destinationDir, `${role}.svelte`)
			keptPaths.add(destination)

			tasks.push(
				(async () => {
					await mkdir(destinationDir, { recursive: true })
					await copyFile(source, destination)
					console.log(`Synced ${sourcePath} -> ${destination}`)
				})().catch((err) => {
					console.error(`Error syncing ${sourcePath}:`, err)
					throw err
				})
			)
		}
	}

	await Promise.all(tasks)
	await cleanOrphans(outDir, keptPaths)
	console.log('Piece custom component sync complete.')
}

syncContent().catch((err) => {
	console.error('Piece custom components sync failed:', err)
	process.exit(1)
})
