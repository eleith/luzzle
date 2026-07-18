import { query } from 'jsonpathly'
import type {
	PieceFrontmatter,
	PieceFrontMatterValue,
	PieceFrontmatterSchemaField,
	PieceFrontmatterProperty,
} from './frontmatter.js'

function parseIndex(key: string): number | undefined {
	if (!/^\d+$/.test(key)) return undefined
	const n = parseInt(key, 10)
	return Number.isSafeInteger(n) ? n : undefined
}

export function getFrontmatterValues<T = PieceFrontMatterValue>(
	obj: PieceFrontmatter,
	path: string
): T[] {
	const selector = path.startsWith('$') ? path : `$.${path}`
	const result = query(obj, selector)
	if (result === undefined || result === null) {
		return []
	}

	const isCollectionQuery = path.includes('*') || path.includes('..') || path.includes('[')
	if (isCollectionQuery && Array.isArray(result)) {
		return result as T[]
	}

	return [result] as T[]
}

export function getFrontmatterValue<T = PieceFrontMatterValue>(
	obj: PieceFrontmatter,
	path: string
): T | undefined {
	const selector = path.startsWith('$') ? path : `$.${path}`
	const result = query(obj, selector)
	const isCollectionQuery = path.includes('*') || path.includes('..')

	if (isCollectionQuery && Array.isArray(result)) {
		return result[0] as T | undefined
	}

	return result as T | undefined
}

export function setFrontmatterValue(
	obj: PieceFrontmatter,
	path: string,
	value: PieceFrontMatterValue
): void {
	const parts = path.split('.')
	const lastPart = parts.pop()!
	let current: Record<string, unknown> = obj as Record<string, unknown>

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]
		const nextPart = i < parts.length - 1 ? parts[i + 1] : lastPart
		const nextIndex = parseIndex(nextPart)
		const isNextIndex = nextIndex !== undefined

		if (Array.isArray(current[part]) && !isNextIndex) {
			throw new Error(
				`Invalid path '${path}': Cannot access property '${nextPart}' on Array at '${parts
					.slice(0, i + 1)
					.join('.')}'`
			)
		}

		if (Array.isArray(current)) {
			const index = parseIndex(part)
			if (index !== undefined && index > current.length) {
				throw new Error(
					`Invalid path '${path}': Index ${index} out of bounds (length: ${current.length})`
				)
			}
		}

		const existing = current[part]
		const exists = part in current && existing !== null && typeof existing === 'object'
		const typeMismatch =
			(isNextIndex && !Array.isArray(existing)) || (!isNextIndex && Array.isArray(existing))

		if (!exists || typeMismatch) {
			current[part] = isNextIndex ? [] : {}
		}
		current = current[part] as Record<string, unknown>
	}

	const lastIndex = parseIndex(lastPart)
	const isLastIndex = lastIndex !== undefined

	if (isLastIndex && Array.isArray(current)) {
		if (lastIndex > current.length) {
			throw new Error(
				`Invalid path '${path}': Index ${lastIndex} out of bounds (length: ${current.length})`
			)
		}
		current[lastIndex] = value
	} else if (Array.isArray(current[lastPart]) && !Array.isArray(value)) {
		current[lastPart].push(value)
	} else {
		current[lastPart] = value
	}
}

export function unsetFrontmatterValue(obj: PieceFrontmatter, path: string): void {
	const parts = path.split('.')
	const lastPart = parts.pop()!
	let current = obj
	const stack: { o: typeof obj; k: string }[] = []

	for (const part of parts) {
		if (current === null || typeof current !== 'object' || !(part in current)) {
			return
		}
		stack.push({ o: current, k: part })
		current = current[part] as PieceFrontmatter
	}

	if (Array.isArray(current)) {
		const index = parseInt(lastPart, 10)
		if (!isNaN(index)) {
			current.splice(index, 1)
		}
	} else if (current !== null && typeof current === 'object') {
		delete current[lastPart]
	}

	// Recursive Pruning:
	// If the current object is now empty, remove it from its parent,
	// and check if that parent is now empty, etc.
	let target = current
	while (
		stack.length > 0 &&
		target !== null &&
		typeof target === 'object' &&
		Object.keys(target).length === 0
	) {
		const parent = stack.pop()!
		delete parent.o[parent.k]
		target = parent.o
	}
}

function getSubFields(
	property: PieceFrontmatterProperty & { type: 'object' }
): Array<PieceFrontmatterSchemaField> {
	const props = property.properties
	const required = property.required || []
	return Object.keys(props).map((name) => {
		const subProp = props[name] as PieceFrontmatterProperty
		const isRequired = required.includes(name)
		const nullable = isRequired ? false : (subProp.nullable ?? true)
		return { ...subProp, name, nullable }
	})
}

function advanceFields(
	currentFields: PieceFrontmatterSchemaField[],
	previousField: PieceFrontmatterSchemaField | undefined
): PieceFrontmatterSchemaField[] {
	if (previousField?.type === 'array' && previousField.items.type === 'object') {
		return getSubFields(previousField.items)
	}
	if (previousField?.type === 'object') {
		return getSubFields(previousField)
	}
	return currentFields
}

export function resolveFieldPaths(
	fields: PieceFrontmatterSchemaField[],
	frontmatter: PieceFrontmatter,
	schemaPath: string
): string[] {
	const parts = schemaPath.split('.')
	let currentFields = fields
	let currentField: PieceFrontmatterSchemaField | undefined

	let branches: Array<{ prefix: string; data: unknown }> = [{ prefix: '', data: frontmatter }]

	for (const part of parts) {
		currentFields = advanceFields(currentFields, currentField)
		currentField = currentFields.find((f) => f.name === part)
		if (!currentField) return []

		branches = branches.map(({ prefix, data }) => ({
			prefix: prefix ? `${prefix}.${part}` : part,
			data: data && typeof data === 'object' ? (data as Record<string, unknown>)[part] : undefined,
		}))

		if (currentField.type === 'array') {
			branches = branches.flatMap(({ prefix, data }) => {
				if (!Array.isArray(data)) return []
				return data.map((item, i) => ({ prefix: `${prefix}.${i}`, data: item }))
			})
		}
	}

	return branches.filter(({ data }) => data != null).map(({ prefix }) => prefix)
}

export function filterFrontmatterFields(
	fields: PieceFrontmatterSchemaField[],
	predicate: (field: PieceFrontmatterProperty) => boolean
): string[] {
	function walk(fields: PieceFrontmatterSchemaField[], prefix: string): string[] {
		const results: string[] = []

		for (const field of fields) {
			const path = prefix ? `${prefix}.${field.name}` : field.name

			if (field.type === 'array') {
				if (predicate(field.items)) {
					results.push(path)
				} else if (field.items.type === 'object') {
					results.push(...walk(getSubFields(field.items), path))
				}
			} else if (field.type === 'object') {
				results.push(...walk(getSubFields(field), path))
			} else if (predicate(field)) {
				results.push(path)
			}
		}

		return results
	}

	return walk(fields, '')
}

export function findFrontmatterField(
	fields: PieceFrontmatterSchemaField[],
	path: string
): PieceFrontmatterSchemaField | undefined {
	const parts = path.split('.')
	let currentFields = fields
	let result: PieceFrontmatterSchemaField | undefined

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]

		if (result?.type === 'array') {
			const index = parseInt(part, 10)
			if (isNaN(index)) {
				currentFields = advanceFields(currentFields, result)
				result = currentFields.find((f) => f.name === part)
			} else {
				result = { ...result.items, name: part, nullable: true }
			}
		} else {
			currentFields = advanceFields(currentFields, result)
			result = currentFields.find((f) => f.name === part)
		}

		if (!result) {
			return undefined
		}

		if (i === parts.length - 1) {
			return result
		}

		if (result.type !== 'object' && result.type !== 'array') {
			return undefined
		}
	}

	return result
}
