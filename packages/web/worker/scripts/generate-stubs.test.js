import { describe, expect, test } from 'vitest'
import { extractClassNames, renderStubFile } from './generate-stubs.js'

describe('extractClassNames', () => {
	test('extracts a single re-export', () => {
		const source = `export { Publish } from './handlers/publish.js'`
		expect(extractClassNames(source)).toEqual(['Publish'])
	})

	test('extracts multiple re-exports in one statement', () => {
		const source = `export { Publish, ArchiveSync, WebSync } from './handlers/index.js'`
		expect(extractClassNames(source)).toEqual(['Publish', 'ArchiveSync', 'WebSync'])
	})

	test('handles `as` aliases by taking the exported name', () => {
		const source = `export { InternalPublish as Publish } from './handlers/publish.js'`
		expect(extractClassNames(source)).toEqual(['Publish'])
	})

	test('extracts inline class declarations', () => {
		const source = `export class Publish extends Job {}\nexport abstract class Foo {}`
		expect(extractClassNames(source)).toEqual(['Publish', 'Foo'])
	})

	test('deduplicates names across re-exports and inline declarations', () => {
		const source = `export { Publish } from './a.js'\nexport class Publish extends Job {}`
		expect(extractClassNames(source)).toEqual(['Publish'])
	})

	test('ignores lowercase identifiers (function/value exports)', () => {
		const source = `export { Publish, helper, _internal } from './x.js'`
		expect(extractClassNames(source)).toEqual(['Publish'])
	})

	test('returns an empty array when there are no class exports', () => {
		expect(extractClassNames(`const x = 1\nexport default x`)).toEqual([])
	})
})

describe('renderStubFile', () => {
	test('emits a header, the Job import, and one stub per name', () => {
		const out = renderStubFile(['Publish'])
		expect(out).toContain('AUTO-GENERATED')
		expect(out).toContain("import { Job } from '@sidequest/core'")
		expect(out).toContain('export class Publish extends Job {')
		expect(out).toContain('run(..._args: unknown[])')
		expect(out).toContain("throw new Error('Publish: producer-side stub")
	})

	test('emits one block per name in input order', () => {
		const out = renderStubFile(['A', 'B'])
		const aIdx = out.indexOf('export class A extends Job')
		const bIdx = out.indexOf('export class B extends Job')
		expect(aIdx).toBeGreaterThan(0)
		expect(bIdx).toBeGreaterThan(aIdx)
	})
})
