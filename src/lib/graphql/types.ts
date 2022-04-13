import { ResultOf } from '@graphql-typed-document-node/core'
import { FieldResolver } from 'nexus'

type ArrayElementType<T> = T extends (infer R)[] ? R : T

export type ExtractResultFieldTypeFor<T, K extends keyof ResultOf<T>> = NonNullable<
  ResultOf<T>[K]
> extends Array<ArrayElementType<ResultOf<T>[K]>>
  ? NonNullable<ArrayElementType<NonNullable<ResultOf<T>[K]>>>
  : NonNullable<ResultOf<T>[K]>

export type ResolverArgsFor<T extends string, K extends string> = Parameters<FieldResolver<T, K>>

export type ResolverFor<T extends string, K extends string> = Promise<
  Awaited<ReturnType<FieldResolver<T, K>>>
>
