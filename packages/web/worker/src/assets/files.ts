import { promises as fs } from 'node:fs'
import type { Stats } from 'node:fs'
import path from 'node:path'

export function isMissingFile(error: unknown): boolean {
	if (!(error instanceof Error)) return false
	return 'code' in error && error.code === 'ENOENT'
}

export async function resolveGeneratedAssetFile(root: string, assetPath: string): Promise<string> {
	if (path.posix.isAbsolute(assetPath) || path.win32.isAbsolute(assetPath)) {
		throw new Error(`Generated asset path must be relative: ${assetPath}`)
	}
	if (assetPath.includes('\\') || assetPath.includes('\0')) {
		throw new Error(`Invalid generated asset path: ${assetPath}`)
	}
	const segments = assetPath.split('/')
	if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
		throw new Error(`Invalid generated asset path: ${assetPath}`)
	}

	const target = path.resolve(root, assetPath)
	let current = path.resolve(root)
	for (const segment of segments) {
		current = path.join(current, segment)
		let entry: Stats
		try {
			entry = await fs.lstat(current)
		} catch (error) {
			if (isMissingFile(error)) break
			throw error
		}
		if (entry.isSymbolicLink()) {
			throw new Error(`Generated asset path contains a symbolic link: ${assetPath}`)
		}
		if (current === target) {
			if (!entry.isFile()) throw new Error(`Generated asset is not a file: ${assetPath}`)
			continue
		}
		if (!entry.isDirectory()) {
			throw new Error(`Generated asset parent is not a directory: ${assetPath}`)
		}
	}
	return target
}
