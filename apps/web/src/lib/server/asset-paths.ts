import path from 'node:path'

export function isSafeRelativePath(value: string): boolean {
	return (
		!value.includes('\\') &&
		!value.includes('\0') &&
		value.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')
	)
}

export function isWithinDirectory(directory: string, target: string): boolean {
	const relative = path.relative(directory, target)
	return (
		relative !== '' &&
		relative !== '..' &&
		!relative.startsWith(`..${path.sep}`) &&
		!path.isAbsolute(relative)
	)
}
