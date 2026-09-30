import { createHash } from 'crypto'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import path from 'path'
import { fileTypeFromBuffer } from 'file-type'
import got from 'got'
import type { PieceFrontmatterSchemaField, PieceFrontMatterValue } from './frontmatter.js'
import type LuzzleStorage from '../../storage/abstract.js'
import { ASSETS_DIRECTORY } from '../assets.js'

type AttachableStream = { stream: Readable; filename?: string }

async function downloadUrlToStream(sourceUrl: string): Promise<AttachableStream> {
	if (!/^https?:\/\//i.test(sourceUrl) || !URL.canParse(sourceUrl)) {
		throw new Error('Asset source must be an HTTP(S) URL')
	}
	const url = new URL(sourceUrl)

	return new Promise((resolve, reject) => {
		const download = got.stream(sourceUrl, {
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
			console.error(`Error downloading file from ${url.origin}`)
			reject(err)
		})
		download.on('response', (response) => {
			if (response.statusCode >= 400) {
				console.error(`Error downloading file from ${url.origin}: http ${response.statusCode}`)
				reject(new Error(`HTTP Error: ${response.statusCode}`))
			} else {
				resolve({ stream: download, filename: path.basename(url.pathname) })
			}
		})
	})
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
): Promise<string>
async function savePieceAsset(
	file: string,
	url: string,
	storage: LuzzleStorage,
	options?: { name?: string }
): Promise<string>
async function savePieceAsset(
	file: string,
	filenameOrUrl: string,
	streamOrStorage: Readable | LuzzleStorage,
	storageOrOptions?: LuzzleStorage | { name?: string }
): Promise<string> {
	let finalStream: Readable
	let targetFilename: string
	let storage: LuzzleStorage

	if (
		streamOrStorage &&
		typeof streamOrStorage === 'object' &&
		'pipe' in streamOrStorage &&
		typeof (streamOrStorage as unknown as Readable).pipe === 'function'
	) {
		targetFilename = filenameOrUrl
		finalStream = streamOrStorage as Readable
		storage = storageOrOptions as LuzzleStorage
	} else {
		storage = streamOrStorage as LuzzleStorage
		const options = storageOrOptions as { name?: string } | undefined
		const res = await downloadUrlToStream(filenameOrUrl)
		finalStream = res.stream
		const originalFilename = res.filename || 'attachment'
		if (options?.name) {
			const ext = path.extname(originalFilename)
			const hasExt = path.extname(options.name) !== ''
			targetFilename = hasExt ? options.name : options.name + ext
		} else {
			targetFilename = originalFilename
		}
	}

	const pieceDir = file.replace(/\.[^.]+$/, '')
	const attachDir = path.join(ASSETS_DIRECTORY, pieceDir)
	const exists = await storage.exists(attachDir)

	if (!exists) {
		await storage.makeDirectory(attachDir)
	}

	const { type: detectedType, stream: detectedStream } = await detectStreamFileType(finalStream)

	const sourceBasename = targetFilename
		? path.basename(targetFilename, path.extname(targetFilename))
		: 'attachment'

	const sourceExt = detectedType
		? '.' + detectedType.ext
		: targetFilename
			? path.extname(targetFilename)
			: ''

	let relPath = path.join(attachDir, sourceBasename + sourceExt)
	let counter = 2

	while (await storage.exists(relPath)) {
		relPath = path.join(attachDir, sourceBasename + '-' + counter + sourceExt)
		counter++
	}

	await pipeline(detectedStream, storage.createWriteStream(relPath))

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
			if (value.startsWith(`${ASSETS_DIRECTORY}/`)) {
				return value
			}
			return downloadUrlToStream(value)
		} else if (typeof value === 'number' || typeof value === 'boolean' || Array.isArray(value)) {
			throw new Error(`${field} must be a string or stream`)
		} else {
			return value
		}
	} else if (type === 'boolean') {
		if (typeof value === 'boolean') return value
		if (value === 1) return true
		if (value === 0) return false
		if (typeof value === 'string') {
			const input = value.toLowerCase()
			if (['true', 't', 'yes', '1'].includes(input)) return true
			if (['false', 'f', 'no', '0'].includes(input)) return false
		}
		throw new Error(`${field.name} must be a boolean`)
	} else if (type === 'integer') {
		if (typeof value === 'number' && Number.isSafeInteger(value)) return value
		if (typeof value === 'string' && /^[+-]?\d+$/.test(value)) {
			const number = Number(value)
			if (Number.isSafeInteger(number)) return number
		}
		throw new Error(`${field.name} must be a safe integer`)
	} else if (type === 'number') {
		if (typeof value === 'number' && Number.isFinite(value)) return value
		if (typeof value === 'string' && value.trim() !== '') {
			const number = Number(value)
			if (Number.isFinite(number)) return number
		}
		throw new Error(`${field.name} must be a finite number`)
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
