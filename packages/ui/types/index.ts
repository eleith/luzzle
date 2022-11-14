import type { ReactElement } from 'react'

export type AllOrNone<T> = T | { [K in keyof T]?: never }

/*
 * Disallow string from React.ReactNode
 */
export type ReactNodeNoStrings = ReactElement | boolean | null | undefined

/* Basic empty type instead of using `{}`
 * https://github.com/typescript-eslint/typescript-eslint/issues/2063#issuecomment-675156492
 */
export type EmptyObject = { [k: string]: unknown }

/* support !important
 * https://github.com/frenic/csstype/issues/160
 */
export type WithImportant<T extends string> = T | `${T} !important`
export type WithImportantArrays<T> = T extends string
  ? WithImportant<T>
  : T extends Array<infer R>
  ? R extends string
    ? WithImportant<R>[]
    : T
  : T

export type ImportantCSS<T> = {
  [Property in keyof T]: WithImportantArrays<T[Property]>
}
