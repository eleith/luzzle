import { ResultOf } from '@graphql-typed-document-node/core'

type ArrayElementType<T> = T extends (infer R)[] ? R : T

export type ExtractResultFieldTypeFor<T, K extends keyof ResultOf<T>> = NonNullable<
  ResultOf<T>[K]
> extends Array<ArrayElementType<ResultOf<T>[K]>>
  ? NonNullable<ArrayElementType<NonNullable<ResultOf<T>[K]>>>
  : NonNullable<ResultOf<T>[K]>
