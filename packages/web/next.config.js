const { createVanillaExtractPlugin } = require('@vanilla-extract/next-plugin')
const path = require('path')
const withVanillaExtract = createVanillaExtractPlugin()
const withTM = require('next-transpile-modules')(['@luzzle/ui'])

const withMDX = require('@next/mdx')({
	extension: /\.mdx?$/,
	options: {
		remarkPlugins: [],
		rehypePlugins: [],
		providerImportSource: '@mdx-js/react',
	},
})

module.exports = withTM(
	withVanillaExtract(
		withMDX({
			reactStrictMode: true,
			poweredByHeader: false,
			pageExtensions: ['tsx', 'api.ts', 'api.tsx'],
			webpack: (config, { isServer }) => {
				if (isServer) {
					config.externals.push('_http_common')
					config.externals.push('encoding')
				}
				return config
			},
			eslint: {
				ignoreDuringBuilds: true,
			},
			experimental: {
				outputFileTracingRoot: path.join(__dirname, '../../'),
			},
			output: 'standalone',
			images: {
				domains: [process.env.IMAGE_DOMAIN || 'localhost'],
			},
		})
	)
)
