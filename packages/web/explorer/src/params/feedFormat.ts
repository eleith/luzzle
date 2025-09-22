export function match(param: string): param is 'json' | 'xml' | 'md' {
	return /(json|xml|md)/.test(param)
}
