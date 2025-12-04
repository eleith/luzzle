import { stat } from 'fs/promises'
import { createHash, randomBytes } from 'crypto'
import { Readable } from 'stream'
import { createReadStream, ReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import path from 'path'
import { fileTypeFromBuffer } from 'file-type'
import got, { Request } from 'got'
import { PieceFrontmatterSchemaField } from './frontmatter.js'
import LuzzleStorage from '../../storage/abstract.js'
import { ASSETS_DIRECTORY } from '../assets.js'

async function downloadToStream(fileOrUrl: string) {
	if (/https?:\/\//i.test(fileOrUrl)) {
		return new Promise((resolve, reject) => {
			const download = got.stream(fileOrUrl, { throwHttpErrors: false })
			download.on('error', (err) => {
				console.error(`Error downloading file from ${fileOrUrl}: ${err.message}`)
				reject(err)
			})
			download.on('response', (response) => {
				if (response.statusCode >= 400) {
					console.error(`Error downloading file from ${fileOrUrl}: http ${response.statusCode}`)
					reject(new Error(`HTTP Error: ${response.statusCode}`))
				} else {
					resolve(download)
				}
			})
		})
	}

	const file = fileOrUrl
	const fileStat = await stat(file).catch(() => null)

	if (fileStat && fileStat.isFile()) {
		return new Promise((resolve, reject) => {
			const stream = createReadStream(file)
			stream.on('error', (err) => {
				console.error(`Error reading file from path: ${err.message}`)
				reject(err)
			})
			stream.on('open', () => {
				resolve(stream)
			})
		})
	}

	throw new Error(`${fileOrUrl} is not a valid file`)
}

function calculateHashFromFile(stream: Readable): Promise<string> {
	const hash = createHash('md5')

	return new Promise((resolve, reject) => {
		stream.on('error', (err) => {
			console.error(`Error calculating hash from stream: ${err.message}`)
			reject(err)
		})
		stream.on('data', (data) => hash.update(data))
		stream.on('end', () => resolve(hash.digest('hex')))
	})
}

async function detectStreamFileType(stream: Readable, maxBytes = 4100) {
	const iterator = stream[Symbol.asyncIterator]()
	const chunks: Buffer[] = []
	let length = 0
	let done = false

	while (length < maxBytes) {
		const next = await iterator.next()
		if (next.done) {
			done = true
			break
		}
		const chunk = Buffer.isBuffer(next.value) ? next.value : Buffer.from(next.value)
		chunks.push(chunk)
		length += chunk.length
	}

	const buffer = Buffer.concat(chunks)
	const type = await fileTypeFromBuffer(buffer)

	async function* gen() {
		if (length > 0) yield buffer
		if (done) return

		let next = await iterator.next()
		while (!next.done) {
			yield next.value
			next = await iterator.next()
		}
	}

	return {
		type,
		stream: Readable.from(gen()),
	}
}

async function makePieceAttachment(
	file: string,
	field: PieceFrontmatterSchemaField,
	stream: Readable | ReadStream | Request,
	storage: LuzzleStorage
): Promise<string> {
	const format = field.type === 'array' ? field.items.format : field.format
	const fileDir = path.dirname(file)
	const random = randomBytes(4).toString('hex')
	const baseName = path.basename(file).replace(/\.[^.]+$/, '')
	const parts = [baseName, random]
	const attachDir = path.join(ASSETS_DIRECTORY, fileDir, field.name)
	const exists = await storage.exists(attachDir)

	/* c8 ignore next 3 */
	if (format !== 'asset') {
		throw new Error(`${field} is not an attachable field for ${file}`)
	}

	if (!exists) {
		await storage.makeDirectory(attachDir)
	}

	const pathName = (stream as Request).requestUrl?.pathname
	const pathStream = (stream as ReadStream).path?.toString()
	const pathWithType = pathName || pathStream

	const { type: detectedType, stream: finalStream } = await detectStreamFileType(stream)

	const type = detectedType?.ext.replace(/^/, '.') || path.extname(pathWithType || '') || path.extname(file)
	const filename = `${parts.filter((x) => x).join('-')}${type}`
	const relPath = path.join(ASSETS_DIRECTORY, fileDir, field.name, filename)
	const writeStream = storage.createWriteStream(relPath)

	await pipeline(finalStream, writeStream)

	return relPath
}

async function makePieceValue(
	field: PieceFrontmatterSchemaField,
	value: number | string | boolean | Readable
) {
	const isArray = field.type === 'array'
	const format = isArray ? field.items.format : field.format
	const type = isArray ? field.items.type : field.type

	if (format === 'asset') {
		if (typeof value === 'string') {
			if (value.startsWith(ASSETS_DIRECTORY)) {
				return value
			}
			return downloadToStream(value) as Promise<Readable>
		} else if (value instanceof Readable) {
			return value
		} else {
			throw new Error(`${field} must be a string or stream`)
		}
	} else if (type === 'boolean') {
		return /1|true|yes/.test(value as string)
	} else if (type === 'integer') {
		return parseInt(value as string)
	}

	return value.toString()
}

export {
	calculateHashFromFile,
	makePieceAttachment,
	makePieceValue,
	detectStreamFileType,
}
