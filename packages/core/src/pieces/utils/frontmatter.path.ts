import {
	PieceFrontmatter,
	PieceFrontMatterValue,
	PieceFrontmatterSchemaField,
	PieceFrontmatterSchemaFieldObject,
} from './frontmatter.js'

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
			return
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

export function findField(
	fields: PieceFrontmatterSchemaField[],
	path: string
): PieceFrontmatterSchemaField | undefined {
	const parts = path.split('.')
	let currentFields = fields
	let result: PieceFrontmatterSchemaField | undefined

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]
		const isIndex = !isNaN(parseInt(part, 10))

		if (isIndex) {
			if (!result || result.type !== 'array') {
				return undefined
			}
			result = { ...result.items, name: part } as PieceFrontmatterSchemaField
		} else {
			result = currentFields.find((f) => f.name === part)
		}

		if (!result || i === parts.length - 1) {
			return result
		}

		if (result.type === 'object') {
			const props = result.properties
			currentFields = Object.keys(props).map(
				(name) => ({ name, ...props[name] }) as PieceFrontmatterSchemaField
			)
		} else if (result.type === 'array') {
			const nextPart = parts[i + 1]
			const nextIsIndex = !isNaN(parseInt(nextPart, 10))

			if (!nextIsIndex && result.items.type === 'object') {
				const props = (result.items as PieceFrontmatterSchemaFieldObject).properties
				currentFields = Object.keys(props).map(
					(name) => ({ name, ...props[name] }) as PieceFrontmatterSchemaField
				)
			} else {
				currentFields = []
			}
		} else {
			return undefined
		}
	}

	return result
}
