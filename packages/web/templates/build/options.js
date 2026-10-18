// Release compilation and independent fixture preparation must stay identical.
export const compilerOptions = Object.freeze({
	generate: 'server',
	dev: false,
	css: 'injected',
	experimental: Object.freeze({ async: false })
});
