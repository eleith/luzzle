import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  test: {
    exclude: ['generated/**', 'build/**', 'node_modules/**'],
    coverage: {
      lines: 95,
      branches: 95,
      statements: 95,
      functions: 95,
      exclude: [
        'generated/**',
        'build/**',
        '**/*{.,-}fixtures.{js,cjs,mjs,ts,tsx,jsx}',
        'coverage/**',
        'packages/*/test{,s}/**',
        '**/*.d.ts',
        'cypress/**',
        'test{,s}/**',
        'test{,-*}.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
        '**/__tests__/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc}.config.{js,cjs,mjs,ts}',
        '**/.{eslint,mocha,prettier}rc.{js,cjs,yml}',
      ],
    },
  },
  resolve: {
    alias: {
      '@app/graphql': path.resolve(__dirname, 'src/lib/graphql/*'),
      '@app/prisma': path.resolve(__dirname, 'generated/prisma/client'),
      '@app/lib/*': path.resolve(__dirname, 'src/lib/*'),
      '@app/common/*': path.resolve(__dirname, 'src/common/*'),
      '@app/public/*': path.resolve(__dirname, 'public/*'),
    },
  },
})
