import { stat } from 'fs/promises'
import { createHash } from 'crypto'
import { Readable } from 'stream'
import { createReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import path from 'path'
import { fileTypeFromBuffer } from 'file-type'
import got from 'got'
import { PieceFrontmatterSchemaField, PieceFrontMatterValue } from './frontmatter.js'
import LuzzleStorage from '../../storage/abstract.js'
import { ASSETS_DIRECTORY } from '../assets.js'

type AttachableStream = { stream: Readable; filename?: string }

async function downloadToStream(fileOrUrl: string): Promise<AttachableStream> {
	if (/https?:\/\//i.test(fileOrUrl)) {
		return new Promise((resolve, reject) => {
			const download = got.stream(fileOrUrl, {
				throwHttpErrors: false,
				headers: {
					'user-agent': 'luzzle/core (https://github.com/eleith/luzzle)',
				},
				retry: {
					limit: 3,
					methods: ['GET'],
				},
				timeout: {
					request: 10000,
				},
			})
			download.on('error', (err) => {
				console.error(`Error downloading file from ${fileOrUrl}: ${err.message}`)
				reject(err)
			})
			download.on('response', (response) => {
				if (response.statusCode >= 400) {
					console.error(`Error downloading file from ${fileOrUrl}: http ${response.statusCode}`)
					reject(new Error(`HTTP Error: ${response.statusCode}`))
				} else {
					const filename = path.basename(new URL(fileOrUrl).pathname)
					resolve({ stream: download, filename })
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
				const filename = path.basename(file)
				resolve({ stream, filename })
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

async function savePieceAsset(
	file: string,
	filename: string,
	stream: Readable,
	storage: LuzzleStorage
): Promise<string> {
	const pieceDir = file.replace(/\.[^.]+$/, '')
	const attachDir = path.join(ASSETS_DIRECTORY, pieceDir)
	const exists = await storage.exists(attachDir)

	if (!exists) {
		await storage.makeDirectory(attachDir)
	}

	const { type: detectedType, stream: finalStream } = await detectStreamFileType(stream)

	const sourceBasename = filename
		? path.basename(filename, path.extname(filename))
		: 'attachment'

	const sourceExt = detectedType
		? '.' + detectedType.ext
		: filename
			? path.extname(filename)
			: ''

	let relPath = path.join(attachDir, sourceBasename + sourceExt)
	let counter = 2

	while (await storage.exists(relPath)) {
		relPath = path.join(attachDir, sourceBasename + '-' + counter + sourceExt)
		counter++
	}

	await pipeline(finalStream, storage.createWriteStream(relPath))

	return relPath
}

async function savePieceFieldAsset(
	file: string,
	field: PieceFrontmatterSchemaField,
	stream: AttachableStream,
	storage: LuzzleStorage
): Promise<string> {
	const format = field.type === 'array' ? field.items.format : field.format

	/* c8 ignore next 3 */
	if (format !== 'asset') {
		throw new Error(`${field} is not an attachable field for ${file}`)
	}

	const filename = stream.filename || field.name
	return savePieceAsset(file, filename, stream.stream, storage)
}

function isAttachableStream(value: unknown): value is AttachableStream {
	return (
		typeof value === 'object' &&
		value !== null &&
		'stream' in value &&
		typeof (value as AttachableStream).stream?.pipe === 'function'
	)
}

async function makePieceValue(
	field: PieceFrontmatterSchemaField,
	value: PieceFrontMatterValue | AttachableStream
): Promise<PieceFrontMatterValue | AttachableStream> {
	const isArray = field.type === 'array'
	const format = isArray ? field.items.format : field.format
	const type = isArray ? field.items.type : field.type

	if (format === 'asset') {
		if (typeof value === 'string') {
			if (value.startsWith(ASSETS_DIRECTORY)) {
				return value
			}
			return downloadToStream(value)
		} else if (typeof value === 'number' || typeof value === 'boolean' || Array.isArray(value)) {
			throw new Error(`${field} must be a string or stream`)
		} else {
			return value
		}
	} else if (type === 'boolean') {
		return /1|true|yes/.test(value as string)
	} else if (type === 'integer') {
		return parseInt(value as string)
	}

	return value
}

export {
	calculateHashFromFile,
	isAttachableStream,
	savePieceFieldAsset,
	makePieceValue,
	detectStreamFileType,
	savePieceAsset,
	type AttachableStream,
}
