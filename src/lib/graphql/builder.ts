import { GraphQLDateTime } from 'graphql-scalars'
import SchemaBuilder from '@pothos/core'
import { Context } from './context'
import SimpleObjectPlugin from '@pothos/plugin-simple-objects'
import ErrorsPlugin from '@pothos/plugin-errors'

const builder = new SchemaBuilder<{
  Scalars: { Date: { Input: Date; Output: Date } }
  Context: Context
  DefaultFieldNullability: true
}>({
  plugins: [SimpleObjectPlugin, ErrorsPlugin],
  defaultFieldNullability: true,
  errorOptions: { defaultTypes: [] },
})

builder.addScalarType('Date', GraphQLDateTime, {})

// we need the root type to add fields
builder.queryType({})
builder.mutationType({})

export default builder
