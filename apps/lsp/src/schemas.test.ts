import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { pathToFileURL } from 'url'
import { discoverSchemas } from './schemas.js'

describe('discoverSchemas', () => {
	let tempRoot: string | null = null

	afterEach(() => {
		if (tempRoot) {
			rmSync(tempRoot, { recursive: true, force: true })
			tempRoot = null
		}
	})

	function createArchive(schemas: Record<string, object>): string {
		tempRoot = mkdtempSync(join(tmpdir(), 'luzzle-test-'))
		const schemasDir = join(tempRoot, '.luzzle', 'schemas')
		mkdirSync(schemasDir, { recursive: true })

		for (const [name, schema] of Object.entries(schemas)) {
			writeFileSync(join(schemasDir, name), JSON.stringify(schema))
		}

		return pathToFileURL(tempRoot).toString()
	}

	it('discovers schemas and maps to piece globs', () => {
		const rootUri = createArchive({
			'books.json': { type: 'object', properties: { title: { type: 'string' } } },
			'films.json': { type: 'object', properties: { title: { type: 'string' } } },
		})

		const { mapping, tempDir } = discoverSchemas(rootUri)

		expect(Object.keys(mapping)).toHaveLength(2)

		const globs = Object.values(mapping).flat()
		expect(globs).toContain('*.books.md')
		expect(globs).toContain('*.films.md')
		expect(tempDir).toBeNull()
	})

	it('returns empty mapping when .luzzle/schemas does not exist', () => {
		tempRoot = mkdtempSync(join(tmpdir(), 'luzzle-test-'))
		const rootUri = pathToFileURL(tempRoot).toString()

		const { mapping, tempDir } = discoverSchemas(rootUri)

		expect(Object.keys(mapping)).toHaveLength(0)
		expect(tempDir).toBeNull()
	})

	it('returns empty mapping for invalid rootUri', () => {
		const { mapping, tempDir } = discoverSchemas('not-a-valid-uri')

		expect(Object.keys(mapping)).toHaveLength(0)
		expect(tempDir).toBeNull()
	})

	it('returns empty mapping when .luzzle/schemas is empty', () => {
		tempRoot = mkdtempSync(join(tmpdir(), 'luzzle-test-'))
		const schemasDir = join(tempRoot, '.luzzle', 'schemas')
		mkdirSync(schemasDir, { recursive: true })
		const rootUri = pathToFileURL(tempRoot).toString()

		const { mapping, tempDir } = discoverSchemas(rootUri)

		expect(Object.keys(mapping)).toHaveLength(0)
		expect(tempDir).toBeNull()
	})

	it('resolves virtual root path when rootPath starts with luzzle-web:///archive', () => {
		const originalCwd = process.cwd
		const tempCwd = mkdtempSync(join(tmpdir(), 'luzzle-cwd-test-'))
		const archiveDir = join(tempCwd, 'archive')
		const schemasDir = join(archiveDir, '.luzzle', 'schemas')
		mkdirSync(schemasDir, { recursive: true })
		writeFileSync(join(schemasDir, 'books.json'), JSON.stringify({}))

		process.cwd = () => tempCwd

		try {
			const { mapping } = discoverSchemas('luzzle-web:///archive')
			expect(Object.keys(mapping)).toHaveLength(1)
			const keys = Object.keys(mapping)
			expect(keys[0]).toContain('books.json')
		} finally {
			process.cwd = originalCwd
			rmSync(tempCwd, { recursive: true, force: true })
		}
	})
})
