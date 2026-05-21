import { describe, test, expect, afterAll, beforeAll } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { renderOpengraphPng } from './render.js'
import type { Config } from '@luzzle/web.config'
import type { PublicWebPiece } from './helpers.js'

const TEMP_DIR = path.join(import.meta.dirname, 'temp-render-fixtures')

const makeConfig = (opengraphPath: string): Config => ({
	pieces: [
		{
			type: 'books',
			components: {
				opengraph: opengraphPath
			}
		}
	],
	paths: {
		config: path.join(TEMP_DIR, 'config.yaml'),
		database: '',
		assets: path.join(TEMP_DIR, 'assets'),
		cache: ''
	},
	assets: { salt: 'test' }
}) as unknown as Config

const onePixelPng = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64'
)

beforeAll(() => {
	mkdirSync(TEMP_DIR, { recursive: true })
})

afterAll(() => {
	rmSync(TEMP_DIR, { recursive: true, force: true })
})

describe('pieces/render', () => {
	test('renders a simple component to a PNG buffer', async () => {
		const svelteContent = `
			<script>
				let { piece, helpers } = $props();
			</script>
			<div style="background-color: white; width: 1200px; height: 630px; display: flex; align-items: center; justify-content: center;">
				<h1>Hello {piece.title}!</h1>
			</div>
		`
		const relPath = './components/book.svelte'
		const absPath = path.resolve(TEMP_DIR, relPath)
		mkdirSync(path.dirname(absPath), { recursive: true })
		writeFileSync(absPath, svelteContent, 'utf8')

		const config = makeConfig(relPath)

		const piece: PublicWebPiece = {
			id: '1',
			key: 'k1',
			title: 'Luzzle Book',
			slug: 'luzzle-book',
			type: 'books',
			date_added: Date.now(),
			metadata: { title: 'Luzzle Book' },
			assets: []
		}

		const buffer = await renderOpengraphPng(piece, config)
		expect(buffer).toBeDefined()
		expect(Buffer.isBuffer(buffer)).toBe(true)
		expect(buffer.length).toBeGreaterThan(0)
	})

	test('renders with local image resource pre-loaded', async () => {
		const svelteContent = `
			<script>
				let { piece, helpers } = $props();
			</script>
			<div style="background-color: white; width: 1200px; height: 630px; display: flex; flex-direction: column;">
				<img src="/pieces/assets/books/k1/cover.png" alt="cover" />
				<h1>Hello {piece.title}!</h1>
			</div>
		`
		const relPath = './components/book-img.svelte'
		const absPath = path.resolve(TEMP_DIR, relPath)
		mkdirSync(path.dirname(absPath), { recursive: true })
		writeFileSync(absPath, svelteContent, 'utf8')

		const config = makeConfig(relPath)

		// Create a mock image asset on disk
		const mockImgDir = path.join(TEMP_DIR, 'assets/books/k1')
		mkdirSync(mockImgDir, { recursive: true })
		writeFileSync(path.join(mockImgDir, 'cover.png'), onePixelPng)

		const piece: PublicWebPiece = {
			id: '1',
			key: 'k1',
			title: 'Luzzle Image Book',
			slug: 'luzzle-img-book',
			type: 'books',
			date_added: Date.now(),
			metadata: { title: 'Luzzle Image Book' },
			assets: [
				{
					asset_key: 'img-key',
					transformation: 'image.original',
					asset_path: 'books/k1/cover.png',
					mime_type: 'image/png'
				}
			]
		}

		const buffer = await renderOpengraphPng(piece, config)
		expect(buffer).toBeDefined()
		expect(Buffer.isBuffer(buffer)).toBe(true)
		expect(buffer.length).toBeGreaterThan(0)
	})
})
