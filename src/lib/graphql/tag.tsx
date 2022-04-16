import gqlTag from 'graphql-tag'
// import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core'
import { DocumentNode } from 'graphql'

function gql<T extends DocumentNode>(x: string): T {
  return gqlTag(x) as T
}

export default gql
