import { GraphQLDateTime } from 'graphql-scalars'
import SchemaBuilder from '@pothos/core'
import { Context } from './context'
import SimpleObjectPlugin from '@pothos/plugin-simple-objects'

const builder = new SchemaBuilder<{
  Scalars: { Date: { Input: Date; Output: Date } }
  Context: Context
  DefaultFieldNullability: true
}>({ plugins: [SimpleObjectPlugin], defaultFieldNullability: true })

builder.addScalarType('Date', GraphQLDateTime, {})
builder.queryType({}) // need to add a root type

export default builder
