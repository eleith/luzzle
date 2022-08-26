import builder from '@app/lib/graphql/builder'

export const ErrorInterface = builder.interfaceRef<Error>('Error')

ErrorInterface.implement({
  fields: (t) => ({
    message: t.exposeString('message'),
  }),
})

builder.objectType(Error, {
  name: 'BaseError',
  interfaces: [ErrorInterface],
})
