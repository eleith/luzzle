import adapter from '@sveltejs/adapter-node'

export default {
	compilerOptions: { experimental: { async: true } },
	kit: {
		adapter: adapter({ out: process.env.TEMPLATE_BUILD_DIR }),
		outDir: process.env.TEMPLATE_KIT_DIR,
		files: { lib: '../../../src/lib' },
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'object-src': ['none']
			}
		}
	}
}
