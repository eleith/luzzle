import { afterEach, expect, test, vi } from 'vitest'
import { languages } from '@codemirror/language-data'
import { highlightSource } from './source-highlight'
import { SOURCE_SIZE_LIMIT } from './source'

afterEach(() => vi.restoreAllMocks())

test('highlighting adds token classes without changing source text or whitespace', async () => {
	const content = ' \r\n{"id":9007199254740993,"id":1e400,"text":"<script>literal</script>"}\t '

	const tokens = await highlightSource(content, 'application/json')

	expect(tokens.map((token) => token.text).join('')).toBe(content)
	expect(tokens.some((token) => token.classes)).toBe(true)
})

test('unknown MIME remains complete plaintext rather than guessing from its contents', async () => {
	const content = ' \r\n<div>{"value":1}</div>\t '

	expect(await highlightSource(content, 'application/octet-stream')).toEqual([
		{ text: content, classes: '' }
	])
})

test('oversized source bypasses the parser and remains complete', async () => {
	const json = languages.find((language) => language.name === 'JSON')!
	const load = vi.spyOn(json, 'load')
	const content = '{"value":1}'.padEnd(SOURCE_SIZE_LIMIT + 1, ' ')

	expect(await highlightSource(content, 'application/json')).toEqual([
		{ text: content, classes: '' }
	])
	expect(load).not.toHaveBeenCalled()
})

test('a missing language leaves the original source readable', async () => {
	vi.spyOn(languages, 'find').mockReturnValueOnce(undefined)
	const content = '{"value":1}\r\n'

	expect(await highlightSource(content, 'application/json')).toEqual([
		{ text: content, classes: '' }
	])
})

test('language-loading failure leaves the original source readable', async () => {
	const json = languages.find((language) => language.name === 'JSON')!
	vi.spyOn(json, 'load').mockRejectedValueOnce(new Error('Language unavailable'))
	const content = '{"value":1}\r\n'

	expect(await highlightSource(content, 'application/json')).toEqual([
		{ text: content, classes: '' }
	])
})

test('parser failure leaves the original source readable', async () => {
	const support = await languages.find((language) => language.name === 'JSON')!.load()
	vi.spyOn(support.language.parser, 'parse').mockImplementationOnce(() => {
		throw new Error('Parser failed')
	})
	const content = '{"value":1}\r\n'

	expect(await highlightSource(content, 'application/json')).toEqual([
		{ text: content, classes: '' }
	])
})
