import gqlTag from 'graphql-tag'
import { DocumentNode } from 'graphql'
import { isArray } from 'lodash'

function gql<T extends DocumentNode>(
  operation: string,
  fragments?: DocumentNode | DocumentNode[]
): T {
  if (fragments) {
    if (isArray(fragments)) {
      const fragment = fragments.reduce((all, f) => gqlTag`${all}${f}`)
      return gqlTag`${operation}${fragment}` as T
    } else {
      const fragment = fragments
      return gqlTag`${operation}${fragment}` as T
    }
  } else {
    return gqlTag`${operation}` as T
  }
}

export default gql
