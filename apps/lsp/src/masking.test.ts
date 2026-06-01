import { describe, it, expect } from 'vitest'
import { maskDocument } from './masking.js'

describe('maskDocument', () => {
	it('preserves frontmatter and masks markdown body', () => {
		const input = '---\ntitle: Hello\nauthor: World\n---\nThis is markdown.\nAnother line.'
		const result = maskDocument(input)

		expect(result.startsWith('---\ntitle: Hello\nauthor: World\n...')).toBe(true)
		const bodyPart = result.slice('---\ntitle: Hello\nauthor: World\n...'.length)
		expect(bodyPart).not.toMatch(/[^\n\r ]/)
		expect(result.split('\n').length).toBe(input.split('\n').length)
	})

	it('preserves line count (1:1 coordinate mapping)', () => {
		const input = '---\na: 1\n---\nline 1\nline 2\nline 3'
		const result = maskDocument(input)

		expect(result.split('\n').length).toBe(input.split('\n').length)
	})

	it('preserves character count per line', () => {
		const input = '---\nkey: value\n---\nHello World!\nFoo bar baz.'
		const result = maskDocument(input)
		const inputLines = input.split('\n')
		const resultLines = result.split('\n')

		for (let i = 0; i < inputLines.length; i++) {
			expect(resultLines[i].length).toBe(inputLines[i].length)
		}
	})

	it('masks entire document when no frontmatter present', () => {
		const input = 'Just some markdown.\nNo frontmatter here.'
		const result = maskDocument(input)

		expect(result).toBe('                   \n                    ')
	})

	it('masks entire document when frontmatter is unclosed', () => {
		const input = '---\ntitle: Unclosed\nNo closing delimiter'
		const result = maskDocument(input)

		expect(result).toBe('   \n               \n                    ')
	})

	it('handles empty frontmatter', () => {
		const input = '---\n---\nBody content'
		const result = maskDocument(input)

		expect(result).toBe('---\n...\n            ')
	})

	it('handles document with no body after frontmatter', () => {
		const input = '---\ntitle: Solo\n---'
		const result = maskDocument(input)

		expect(result).toBe('---\ntitle: Solo\n...')
	})

	it('does not treat --- in body as a second closing delimiter', () => {
		const input = '---\ntitle: Test\n---\nSome text\n---\nMore text'
		const result = maskDocument(input)

		expect(result).toBe('---\ntitle: Test\n...\n         \n   \n         ')
	})

	it('handles multiline YAML values', () => {
		const input = '---\ndescription: "A very long\n  description value"\n---\nBody'
		const result = maskDocument(input)

		expect(result).toBe('---\ndescription: "A very long\n  description value"\n...\n    ')
	})

	it('handles empty string input', () => {
		const result = maskDocument('')

		expect(result).toBe('')
	})

	it('preserves \\r\\n line endings', () => {
		const input = '---\r\ntitle: Test\r\n---\r\nBody text\r\n'
		const result = maskDocument(input)

		expect(result.match(/\r/g)?.length).toBe(input.match(/\r/g)?.length)
		expect(result.match(/\n/g)?.length).toBe(input.match(/\n/g)?.length)
	})
})
