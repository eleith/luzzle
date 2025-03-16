export function match(param: string): param is 'jpg' | 'avif' | 'webp' {
	return /(avif|jpg|webp)/.test(param)
}
