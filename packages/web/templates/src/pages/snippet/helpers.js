/** @param {NonNullable<import('./schema.js').Fields['files']>} files */
export function getFileByline(files) {
	if (!files.length) return [];
	const formats = [...new Set(files.map((file) => file.format).filter(Boolean))];
	return [
		...(formats.length ? [formats.join(', ')] : []),
		files.length > 1 ? `${files.length} files` : '1 file'
	];
}
