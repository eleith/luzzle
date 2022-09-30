import builder from '@app/lib/graphql/builder'
import { ZodError, ZodFormattedError } from 'zod'
import { ErrorInterface } from './error'

// https://pothos-graphql.dev/docs/plugins/errors

function flattenErrors(
  error: ZodFormattedError<unknown>,
  path: string[]
): { path: string[]; message: string }[] {
  // eslint-disable-next-line no-underscore-dangle
  const errors = error._errors.map((message) => ({
    path,
    message,
  }))

  Object.keys(error).forEach((key) => {
    if (key !== '_errors') {
      const flatError = flattenErrors(
        (error as Record<string, unknown>)[key] as ZodFormattedError<unknown>,
        [...path, key]
      )
      errors.push(...flatError)
    }
  })

  return errors
}

const ZodFieldError = builder
  .objectRef<{
    message: string
    path: string
  }>('FieldErrors')
  .implement({
    fields: (t) => ({
      message: t.exposeString('message'),
      path: t.exposeString('path'),
    }),
  })

// The actual error type
builder.objectType(ZodError, {
  name: 'ValidationError',
  interfaces: [ErrorInterface],
  fields: (t) => ({
    fieldErrors: t.field({
      type: [ZodFieldError],
      resolve: (err) => {
        const zodErrors = flattenErrors(err.format(), [])
        const flatErrors = zodErrors.map((zodError) => ({
          message: zodError.message,
          path: zodError.path.join('.'),
        }))
        return flatErrors
      },
    }),
  }),
})
