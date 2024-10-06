export function match(param: string): param is 'svg' | 'png' {
	return /(svg|png)/.test(param)
}
