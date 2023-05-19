const { createVanillaExtractPlugin } = require('@vanilla-extract/next-plugin')
const withVanillaExtract = createVanillaExtractPlugin()
const withTM = require('next-transpile-modules')(['@luzzle/ui'])
const { PrismaPlugin } = require('@prisma/nextjs-monorepo-workaround-plugin')

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
      pageExtensions: ['tsx', 'api.ts'],
      webpack: (config, { isServer }) => {
        if (isServer) {
          config.externals.push('_http_common')
          config.externals.push('encoding')
          config.plugins = [...config.plugins, new PrismaPlugin()]
        }
        return config
      },
      eslint: {
        ignoreDuringBuilds: true,
      },
      output: 'standalone',
      images: {
        domains: [process.env.IMAGE_DOMAIN || 'localhost'],
      },
    })
  )
)
