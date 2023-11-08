import { createWriteStream } from 'fs'
import got from 'got'
import { temporaryFile } from 'tempy'

async function downloadToTmp(url: string): Promise<string> {
	const filePath = temporaryFile()
	await downloadToPath(url, filePath)

	return filePath
}

async function downloadToPath(url: string, path: string): Promise<boolean> {
	const response = got.stream(url)
	const writer = createWriteStream(path)

	response.pipe(writer)

	return new Promise((resolve, reject) => {
		writer.on('finish', () => resolve(true))
		writer.on('error', reject)
		response.on('error', reject)
	})
}

export { downloadToTmp, downloadToPath }
