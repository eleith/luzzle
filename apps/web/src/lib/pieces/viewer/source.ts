export type SourceToken = { text: string; classes: string }

export const SOURCE_SIZE_LIMIT = 100_000
const JSON_DEPTH_LIMIT = 100

export function sourceLanguage(mime: string): string | undefined {
	const type = mime.split(';', 1)[0].trim().toLowerCase()
	const suffix = /^[a-z0-9!#$%&'*+.^_`|~-]+\/[a-z0-9!#$%&'*+.^_`|~-]+\+(json|xml)$/.exec(type)?.[1]
	if (type === 'application/json' || type === 'text/json' || suffix === 'json') return 'JSON'
	if (type === 'text/html' || type === 'application/xhtml+xml') return 'HTML'
	if (type === 'application/xml' || type === 'text/xml' || suffix === 'xml') return 'XML'
	switch (type) {
		case 'text/css':
			return 'CSS'
		case 'text/javascript':
		case 'application/javascript':
		case 'text/ecmascript':
		case 'application/ecmascript':
			return 'JavaScript'
		case 'text/markdown':
			return 'Markdown'
		case 'application/yaml':
		case 'application/x-yaml':
		case 'text/yaml':
		case 'text/x-yaml':
			return 'YAML'
	}
}

export function formatSource(content: string, mime: string): string {
	if (content.length > SOURCE_SIZE_LIMIT || sourceLanguage(mime) !== 'JSON') return content
	try {
		// Validate only: serializing the parsed value would lose numeric precision and original lexemes.
		JSON.parse(content)
		return formatJsonTokens(content) ?? content
	} catch {
		return content
	}
}

function formatJsonTokens(content: string): string | undefined {
	const tokens = content.match(/"(?:[^"\\]|\\.)*"|[^\s{}[\],:]+|[{}[\],:]/g) ?? []
	const output: string[] = []
	let depth = 0
	let size = 0
	const newline = () => '\n' + '  '.repeat(depth)

	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index]
		let text = token
		if (token === '{' || token === '[') {
			if (++depth > JSON_DEPTH_LIMIT) return
			if (tokens[index + 1] !== (token === '{' ? '}' : ']')) text += newline()
		} else if (token === '}' || token === ']') {
			depth--
			if (tokens[index - 1] !== (token === '}' ? '{' : '[')) text = newline() + token
		} else if (token === ',') {
			text += newline()
		} else if (token === ':') {
			text += ' '
		}
		size += text.length
		if (size > SOURCE_SIZE_LIMIT) return
		output.push(text)
	}
	return output.join('')
}
