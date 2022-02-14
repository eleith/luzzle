import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@app/gql': path.resolve(__dirname, 'generated/gql'),
      '@app/prisma': path.resolve(__dirname, 'generated/prisma/client'),
      '@app/lib/*': path.resolve(__dirname, 'src/lib/*'),
      '@app/common/*': path.resolve(__dirname, 'src/common/*'),
      '@app/public/*': path.resolve(__dirname, 'public/*'),
    },
  },
})
