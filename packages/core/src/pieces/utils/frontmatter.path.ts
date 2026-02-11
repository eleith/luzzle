import { PieceFrontmatter, PieceFrontMatterValue } from './frontmatter.js'

/**
 * Utility for navigating and modifying nested PieceFrontmatter using dot-notation.
 * Supports numeric indices for arrays (e.g., 'metadata.tags.0').
 */

/**
 * Retrieves a value from a nested frontmatter object by path.
 */
export function get(obj: PieceFrontmatter, path: string): PieceFrontMatterValue | undefined {
	const parts = path.split('.')
	let current: unknown = obj

	for (const part of parts) {
		if (current === null || typeof current !== 'object') {
			return undefined
		}
		current = (current as Record<string, unknown>)[part]
	}

	return current as PieceFrontMatterValue
}

/**
 * Sets or appends a value in a nested frontmatter object by path.
 */
export function set(obj: PieceFrontmatter, path: string, value: PieceFrontMatterValue): void {
	const parts = path.split('.')
	const lastPart = parts.pop()!
	let current: Record<string, unknown> = obj as Record<string, unknown>

	for (const part of parts) {
		if (!(part in current) || current[part] === null || typeof current[part] !== 'object') {
			current[part] = {}
		}
		current = current[part] as Record<string, unknown>
	}

	const existing = current[lastPart]
	if (Array.isArray(existing)) {
		existing.push(value)
	} else {
		current[lastPart] = value
	}
}

/**
 * Removes a value or an array element from a nested frontmatter object by path.
 */
export function unset(obj: PieceFrontmatter, path: string): void {
	const parts = path.split('.')
	const lastPart = parts.pop()!
	let current: unknown = obj

	for (const part of parts) {
		if (
			current === null ||
			typeof current !== 'object' ||
			!(part in (current as Record<string, unknown>))
		) {
			return // Path doesn't exist
		}
		current = (current as Record<string, unknown>)[part]
	}

	if (Array.isArray(current)) {
		const index = parseInt(lastPart, 10)
		if (!isNaN(index)) {
			current.splice(index, 1)
		}
	} else if (current !== null && typeof current === 'object') {
		delete (current as Record<string, unknown>)[lastPart]
	}
}
