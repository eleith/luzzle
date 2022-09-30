import builder from '@app/lib/graphql/builder'
import './error'
import './book'
import './discussion'

const schema = builder.toSchema({})

export default schema

// we use graph-codegen to generate typescript types from the schema
//
// import { printSchema, lexicographicSortSchema } from 'graphql'
// import { writeFileSync } from 'fs'
// const schemaAsString = printSchema(lexicographicSortSchema(schema))
// writeFileSync('my-schema.graphql', schemaAsString)
