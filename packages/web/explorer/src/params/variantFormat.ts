export function match(param: string): param is 'jpg' | 'avif' | 'webp' | 'png' {
	return /(avif|jpg|webp|png)/.test(param)
}
