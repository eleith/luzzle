const DEBUG = process.env['LUZZLE_LSP_DEBUG'] === '1'

export function debug(msg: string): void {
	if (DEBUG) {
		process.stderr.write(`[luzzle-lsp] ${msg}\n`)
	}
}

export function error(msg: string): void {
	process.stderr.write(`[luzzle-lsp] ${msg}\n`)
}
