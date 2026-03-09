import { existsSync, readdirSync } from 'fs'
import { join, basename } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

/**
 * Discovers .luzzle/schemas/*.json at the workspace root and
 * returns the schema mapping.
 */
export function discoverSchemas(rootUri: string): { mapping: Record<string, string[]>; tempDir: string | null } {
	const mapping: Record<string, string[]> = {}

	let rootPath: string
	try {
		rootPath = fileURLToPath(rootUri)
	} catch {
		return { mapping, tempDir: null }
	}

	const schemasDir = join(rootPath, '.luzzle', 'schemas')
	if (!existsSync(schemasDir)) {
		return { mapping, tempDir: null }
	}

	const schemaFiles = readdirSync(schemasDir).filter((f) => f.endsWith('.json'))
	if (schemaFiles.length === 0) {
		return { mapping, tempDir: null }
	}

	for (const file of schemaFiles) {
		const pieceType = basename(file, '.json')
		const sourcePath = join(schemasDir, file)

		const schemaUri = pathToFileURL(sourcePath).toString()
		mapping[schemaUri] = [`*.${pieceType}.md`]
	}

	return { mapping, tempDir: null }
}
