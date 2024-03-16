const { createVanillaExtractPlugin } = require('@vanilla-extract/next-plugin')
const path = require('path')
const withVanillaExtract = createVanillaExtractPlugin()
const withTM = require('next-transpile-modules')(['@luzzle/ui'])

module.exports = withTM(
	withVanillaExtract({
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
