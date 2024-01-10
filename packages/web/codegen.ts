import type { CodegenConfig } from '@graphql-codegen/cli'
import { printSchema } from 'graphql'
import schema from './src/common/graphql/schema.js'

const config: CodegenConfig = {
	schema: printSchema(schema),
	documents: 'src/**/!(*.generated).{ts,tsx}',
	overwrite: true,
	generates: {
		'./generated/schema.graphql': {
			plugins: ['schema-ast'],
		},
		'./src/@types/graphql.d.ts': {
			plugins: ['typescript'],
		},
		'./src/': {
			preset: 'near-operation-file',
			presetConfig: {
				extension: '.ts',
				baseTypesPath: '@types/graphql.d.ts',
				folder: '_gql_',
			},
			plugins: ['typescript-operations', 'typed-document-node'],
		},
	},
}

export default config
