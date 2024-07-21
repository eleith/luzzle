import { createWriteStream } from 'fs'
import got from 'got'
import { temporaryFile } from 'tempy'
import log from './log.js'

async function downloadToTmp(url: string): Promise<string | null> {
	const filePath = temporaryFile()
	const downloaded = await downloadToPath(url, filePath)

	return downloaded ? filePath : null
}

async function downloadToPath(url: string, path: string): Promise<boolean> {
	const response = got.stream(url, { timeout: { request: 10000 } })
	const writer = createWriteStream(path)

	response.pipe(writer)

	return new Promise((resolve) => {
		const resolveLogError = () => {
			log.error(`failed to download ${url} to ${path}`)
			resolve(false)
		}

		writer.on('finish', () => resolve(true))
		writer.on('error', resolveLogError)
		response.on('error', resolveLogError)
	})
}

export { downloadToTmp, downloadToPath }
