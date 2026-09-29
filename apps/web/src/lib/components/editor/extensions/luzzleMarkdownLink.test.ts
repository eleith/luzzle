import { describe, expect, test, vi } from 'vitest'
import { isAssetLink } from './luzzleMarkdownLink'

vi.mock('virtual:icons/ph/arrow-circle-up-right?raw&width=20&height=20', () => ({
	default: '<svg />'
}))
vi.mock('virtual:icons/ph/pencil-simple?raw&width=20&height=20', () => ({
	default: '<svg />'
}))

describe('isAssetLink', () => {
	test('recognizes archive asset paths', () => {
		expect(isAssetLink('.assets/books/cover.png')).toBe(true)
		expect(isAssetLink('./.assets/books/cover.png')).toBe(true)
	})

	test('leaves all other links alone', () => {
		for (const url of [
			'/piece/books/4',
			'./other.books.md',
			'../other.books.md',
			'https://example.com/book',
			'/piece/.assets/cover',
			'/.assets/books/cover.png'
		]) {
			expect(isAssetLink(url)).toBe(false)
		}
	})
})
