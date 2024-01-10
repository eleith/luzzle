import builder from '@app/lib/graphql/builder'

const ErrorInterface = builder.interfaceRef<Error>('ErrorInterface').implement({
	fields: (t) => ({
		message: t.exposeString('message'),
	}),
})

builder.objectType(Error, {
	name: 'Error',
	interfaces: [ErrorInterface],
})

export { ErrorInterface }
