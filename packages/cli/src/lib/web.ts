import { createWriteStream } from 'fs'
import got from 'got'
import { temporaryFile } from 'tempy'

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
			console.error(`failed to download ${url} to ${path}`)
			// console.error(error)
			resolve(false)
		}

		writer.on('finish', () => resolve(true))
		writer.on('error', resolveLogError)
		response.on('error', resolveLogError)
	})
}

export { downloadToTmp, downloadToPath }
