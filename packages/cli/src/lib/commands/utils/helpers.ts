import path from 'path'
import { existsSync } from 'fs'

function parseSlugFromPath(possiblePath: string): string | null {
	const isPathToBook = new RegExp(`(.*/)?books/.*\\.md$`)

	if (existsSync(possiblePath) && isPathToBook.test(possiblePath)) {
		return path.parse(possiblePath).name
	}

	return null
}

export { parseSlugFromPath }
