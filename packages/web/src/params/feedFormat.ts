export function match(param: string): param is 'json' | 'xml' {
	return /(json|xml)/.test(param)
}
