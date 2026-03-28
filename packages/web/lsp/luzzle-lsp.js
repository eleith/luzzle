const LSP_ROOT = process.env.LUZZLE_LSP_ROOT || '/app/archive'
const ROOT_URI = `file://${LSP_ROOT}`

/**
 * Inject rootUri into initialize requests so luzzle-lsp can discover schemas.
 */
function injectRootUri(message) {
	if (message.method === 'initialize' && message.params) {
		message.params.rootUri = ROOT_URI
	}
	return message
}

const route = {
	name: 'luzzle-lsp',
	command: 'luzzle-lsp',
	args: ['--stdio'],
	spawnOptions: { env: { ...process.env, LUZZLE_LSP_ROOT: LSP_ROOT } },
	transform: injectRootUri,
}

export { route, injectRootUri }
