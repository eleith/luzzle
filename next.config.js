module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('_http_common')
      config.externals.push('encoding');
    }
    return config
  },
}
