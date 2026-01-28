/**
 * Normalizes a value for comparison.
 * - Converts null/undefined to empty string.
 * - Normalizes newlines in strings to \n.
 */
export function normalize(value: unknown): unknown {
	if (value === null || value === undefined) {
		return ''
	}
	if (typeof value === 'string') {
		return value.replace(/\r\n/g, '\n')
	}
	return value
}

/**
 * deeply compares two values after normalization.
 */
export function isFieldEqual(a: unknown, b: unknown): boolean {
	const normA = normalize(a)
	const normB = normalize(b)

	if (normA === normB) {
		return true
	}

	if (typeof normA !== typeof normB) {
		return false
	}

	if (typeof normA === 'object' && normA !== null && normB !== null) {
		if (Array.isArray(normA) !== Array.isArray(normB)) {
			return false
		}

		if (Array.isArray(normA) && Array.isArray(normB)) {
			if (normA.length !== normB.length) {
				return false
			}
			return normA.every((val, index) => isFieldEqual(val, normB[index]))
		}

		const keysA = Object.keys(normA as Record<string, unknown>)
		const keysB = Object.keys(normB as Record<string, unknown>)

		if (keysA.length !== keysB.length) {
			return false
		}

		for (const key of keysA) {
			if (
				!Object.prototype.hasOwnProperty.call(normB, key) ||
				!isFieldEqual(
					(normA as Record<string, unknown>)[key],
					(normB as Record<string, unknown>)[key]
				)
			) {
				return false
			}
		}

		return true
	}

	return false
}
