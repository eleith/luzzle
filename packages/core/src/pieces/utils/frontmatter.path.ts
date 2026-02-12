import {
	PieceFrontmatter,
	PieceFrontMatterValue,
	PieceFrontmatterSchemaField,
	PieceFrontmatterProperty,
} from './frontmatter.js'

export function getFrontmatterValue(
	obj: PieceFrontmatter,
	path: string
): PieceFrontMatterValue | undefined {
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
		const isNextIndex = !isNaN(parseInt(nextPart, 10))

		if (
			!(part in current) ||
			current[part] === null ||
			typeof current[part] !== 'object' ||
			(isNextIndex && !Array.isArray(current[part])) ||
			(!isNextIndex && Array.isArray(current[part]))
		) {
			current[part] = isNextIndex ? [] : {}
		}
		current = current[part] as Record<string, unknown>
	}

	const isLastIndex = !isNaN(parseInt(lastPart, 10))

	if (isLastIndex && Array.isArray(current)) {
		const index = parseInt(lastPart, 10)
		current[index] = value
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
				// Handle index-less lookup into array items (if items are objects)
				if (result.items.type === 'object') {
					currentFields = getSubFields(result.items)
					result = currentFields.find((f) => f.name === part)
				} else {
					return undefined
				}
			} else {
				result = { ...result.items, name: part, nullable: true }
			}
		} else {
			result = currentFields.find((f) => f.name === part)
		}

		if (!result) {
			return undefined
		}

		if (i === parts.length - 1) {
			return result
		}

		if (result.type === 'object') {
			currentFields = getSubFields(result)
		} else if (result.type === 'array') {
			const nextPart = parts[i + 1]
			const nextIsIndex = nextPart !== undefined && !isNaN(parseInt(nextPart, 10))

			if (!nextIsIndex && result.items.type === 'object') {
				currentFields = getSubFields(result.items)
			} else {
				currentFields = []
			}
		} else {
			return undefined
		}
	}

	return result
}
