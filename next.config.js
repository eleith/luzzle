const process = require('process')

module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  pageExtensions: ['tsx', 'api.ts'],
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
  images: {
    domains: [process.env.IMAGE_DOMAIN],
  },
}
