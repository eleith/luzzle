import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createReadStream } from 'node:fs'
import type * as FileSystem from 'node:fs'
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import type * as FileSystemPromises from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { validateConfig } from '@luzzle/web.config'
import type { Pieces } from '@luzzle/core'
import { codeToHtml } from 'shiki'
import type * as Shiki from 'shiki'
import type { TransformInput } from '../utils/types.js'
import { makeLogger } from '../../../test/logger.js'
import { run } from './index.js'

vi.mock('shiki', async (importOriginal) => ({
	...(await importOriginal<typeof Shiki>()),
	codeToHtml: vi.fn(),
}))
vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof FileSystem>()
	return { ...actual, createReadStream: vi.fn(actual.createReadStream) }
})
vi.mock('node:fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof FileSystemPromises>()
	return { ...actual, stat: vi.fn(actual.stat) }
})

const source = '.assets/example/main.js'
const output = 'snippets/piece-key/main.js'
const code = 'console.log("hi")'
const html = '<pre class="shiki">highlighted code</pre>'
let directory: string

function makeInput(): TransformInput {
	return {
		webPiece: {
			id: 'example',
			key: 'piece-key',
			type: 'snippets',
			slug: 'example',
			title: 'Example',
			file_path: 'example.snippets.md',
			date_added: 1,
			json_metadata: JSON.stringify({ files: [{ file: 'code' }] }),
		},
		config: validateConfig(
			{
				pieces: [
					{
						type: 'snippets',
						fields: {
							title: 'title',
							date_consumed: 'date',
							attachments: ['files[*].file', 'downloads'],
							highlight: ['files[*].file'],
						},
					},
				],
			},
			{}
		),
		outDir: directory,
		pieces: {} as Pieces,
		assetKeyToPath: new Map([['code', source]]),
		priorAssets: [
			{
				asset_key: 'code',
				transformation: 'attachment',
				asset_path: output,
				mime_type: 'text/javascript',
			},
		],
		logger: makeLogger(),
	}
}

beforeEach(async () => {
	directory = await mkdtemp(path.join(tmpdir(), 'luzzle-highlight-'))
	await mkdir(path.dirname(path.join(directory, output)), { recursive: true })
	await writeFile(path.join(directory, output), code)
	vi.mocked(codeToHtml).mockResolvedValue(html)
})

afterEach(async () => {
	vi.clearAllMocks()
	await rm(directory, { recursive: true, force: true })
})

test('does not read or highlight attachments without explicit selection', async () => {
	const input = makeInput()
	delete input.config.pieces[0].fields.highlight

	expect(await run(input)).toEqual([])
	expect(createReadStream).not.toHaveBeenCalled()
	expect(codeToHtml).not.toHaveBeenCalled()
})

test('highlights selected originals once, leaving other attachments unread', async () => {
	const input = makeInput()
	input.config.pieces[0].fields.highlight?.push('source')
	input.webPiece.json_metadata = JSON.stringify({
		files: [{ file: 'code' }],
		source: 'code',
		downloads: ['recording'],
	})
	input.assetKeyToPath.set('recording', '.assets/example/recording.gif')
	input.priorAssets?.push({
		asset_key: 'recording',
		transformation: 'attachment',
		asset_path: 'snippets/piece-key/recording.gif',
		mime_type: 'image/gif',
	})

	const records = await run(input)

	expect(createReadStream).toHaveBeenCalledTimes(1)
	expect(codeToHtml).toHaveBeenCalledExactlyOnceWith(code, {
		lang: 'javascript',
		defaultColor: false,
		themes: { light: 'github-light', dark: 'github-dark' },
	})
	expect(records).toEqual([
		{
			transformation: 'highlight',
			piece_asset_path: source,
			asset_path: null,
			mime_type: 'text/html',
			is_embedded: 1,
			content: html,
		},
	])
})

test.each(['unregistered', 'ungenerated'])(
	'skips a selected %s attachment before file access',
	async (missing) => {
		const input = makeInput()
		if (missing === 'unregistered') input.assetKeyToPath.clear()
		else input.priorAssets = []

		expect(await run(input)).toEqual([])
		expect(createReadStream).not.toHaveBeenCalled()
		expect(codeToHtml).not.toHaveBeenCalled()
		expect(input.logger.warn).toHaveBeenCalledWith(
			'Highlight skipped',
			expect.objectContaining({
				reason: 'not a registered, generated attachment',
			})
		)
	}
)

test('rejects an oversized source before reading its contents', async () => {
	const input = makeInput()
	await writeFile(path.join(directory, output), Buffer.alloc(100 * 1024 + 1, 'a'))

	expect(await run(input)).toEqual([])
	expect(createReadStream).not.toHaveBeenCalled()
	expect(codeToHtml).not.toHaveBeenCalled()
	expect(input.logger.warn).toHaveBeenCalledWith('Highlight skipped', {
		file: input.webPiece.file_path,
		asset: source,
		reason: 'source exceeds 102400 bytes',
	})
})

test('caps the read and rejects a source that grew after stat', async () => {
	const input = makeInput()
	const filename = path.join(directory, output)
	const staleStat = await stat(filename)
	await writeFile(filename, Buffer.alloc(200 * 1024, 'a'))
	vi.mocked(stat).mockResolvedValueOnce(staleStat)

	expect(await run(input)).toEqual([])
	expect(createReadStream).toHaveBeenCalledWith(filename, { start: 0, end: 100 * 1024 })
	expect(codeToHtml).not.toHaveBeenCalled()
	expect(input.logger.warn).toHaveBeenCalledWith('Highlight skipped', {
		file: input.webPiece.file_path,
		asset: source,
		reason: 'source exceeds 102400 bytes',
	})
})

test.each([
	['NUL bytes', Buffer.from('GIF89a\0'), 'source contains NUL bytes'],
	['invalid UTF-8', Buffer.from([0xc3, 0x28]), 'source is not valid UTF-8'],
])('rejects %s before Shiki, regardless of the code extension', async (_name, bytes, reason) => {
	const input = makeInput()
	await writeFile(path.join(directory, output), bytes)

	expect(await run(input)).toEqual([])
	expect(codeToHtml).not.toHaveBeenCalled()
	expect(input.logger.warn).toHaveBeenCalledWith('Highlight skipped', {
		file: input.webPiece.file_path,
		asset: source,
		reason,
	})
})

test('renders selected valid text with an unknown extension as plain text', async () => {
	const input = makeInput()
	const output = 'snippets/piece-key/notes.unknown'
	input.assetKeyToPath.set('code', '.assets/example/notes.unknown')
	input.priorAssets = [
		{
			asset_key: 'code',
			transformation: 'attachment',
			asset_path: output,
			mime_type: 'application/octet-stream',
		},
	]
	await writeFile(path.join(directory, output), 'plain text')

	await run(input)

	expect(codeToHtml).toHaveBeenCalledWith('plain text', expect.objectContaining({ lang: 'text' }))
})

test('discards generated HTML exceeding the byte limit', async () => {
	const input = makeInput()
	vi.mocked(codeToHtml).mockResolvedValue('é'.repeat(256 * 1024 + 1))

	expect(await run(input)).toEqual([])
	expect(input.logger.warn).toHaveBeenCalledWith('Highlight skipped', {
		file: input.webPiece.file_path,
		asset: source,
		reason: 'generated HTML exceeds 524288 bytes',
	})
})

test('does not swallow filesystem failures', async () => {
	await rm(path.join(directory, output))

	await expect(run(makeInput())).rejects.toMatchObject({ code: 'ENOENT' })
})

test('does not swallow Shiki failures', async () => {
	vi.mocked(codeToHtml).mockRejectedValue(new Error('shiki failed'))

	await expect(run(makeInput())).rejects.toThrow('shiki failed')
})
