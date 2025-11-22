import { loadConfig } from '@luzzle/web.utils/server'
import { spawn } from 'child_process'

const CONFIG_PATH = './config.yaml'
const LUZZLE_ASSETS_FOLDER = process.argv[2] || './static/pieces/assets'

async function waitForServer(url, timeout = 13000) {
	const startTime = Date.now()
	while (Date.now() - startTime < timeout) {
		try {
			const res = await fetch(url)
			if (res.ok) return true
		} catch (e) {
			if (e.code !== 'ECONNREFUSED') {
				console.log('spinning')
			}
		}
		await new Promise((resolve) => setTimeout(resolve, 300))
	}
	throw new Error(`Server did not start at ${url} within ${timeout}ms`)
}

async function generateAllOpenGraphs(database, assets) {
	return new Promise((resolve, reject) => {
		console.log('📸 Starting OpenGraphs generation...')

		const ogProcess = spawn(
			'npx luzzle-tools',
			['opengraph', '--config', 'config.yaml', '--luzzle', database, '--out', assets],
			{
				stdio: 'inherit',
				shell: true
			}
		)

		ogProcess.on('close', (code) => {
			if (code === 0) {
				console.log('✅ OpenGraphs generation complete.')
				resolve()
			} else {
				reject(new Error(`generate-og failed with exit code ${code}`))
			}
		})

		ogProcess.on('error', (err) => {
			reject(err)
		})
	})
}

async function main() {
	const config = loadConfig(CONFIG_PATH)
	const database = config.paths.database
	const url = config.url.app

	let serverProcess

	try {
		console.log('🚀 Starting SvelteKit server...')

		serverProcess = spawn('npm', ['run', 'preview', '--', '--host'], {
			stdio: ['ignore', 'inherit', 'inherit'],
			shell: true,
			detached: true
		})

		console.log('⏳ Waiting for server to be ready...')
		await waitForServer(url)
		console.log('🟢 Server is up!')

		await generateAllOpenGraphs(database, LUZZLE_ASSETS_FOLDER)
	} catch (err) {
		console.error('❌ Error during pipeline:', err)
		process.exitCode = 1
	} finally {
		if (serverProcess) {
			console.log('🛑 Stopping server...')
			process.kill(-serverProcess.pid)
			process.exit()
		}
	}
}

main().catch((err) => {
	console.error('❌ Unhandled error in main:', err)
	process.exit(1)
})
