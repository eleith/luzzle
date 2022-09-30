import { ResultOf } from '@graphql-typed-document-node/core'
import { Error, ValidationError } from './graphql'

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer I> ? Array<DeepPartial<I>> : DeepPartial<T[P]>
}

export type ResultSuccessOf<T, X> = NonNullable<
  Exclude<ResultOf<T>[X], Error | ValidationError>
>['data']

export type ResultOneOf<T, X> = NonNullable<ResultOf<T>[X]>[number]
