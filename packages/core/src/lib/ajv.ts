import Ajv, { ValidateFunction, JSONSchemaType } from 'ajv'

export function commaSeparatedFormatValidator(data: string) {
	return typeof data === 'string'
}

export function dateFormatValidator(data: string) {
	return !isNaN(Date.parse(data))
}

export function assetFormatValidator(data: string) {
	return /^\.assets\/.+\/.+/.test(data)
}

export function paragraphValidator(data: string) {
	return typeof data === 'string'
}

export default function <T>(schema: JSONSchemaType<T>): ValidateFunction<T> {
	const ajv = new Ajv()

	ajv.addFormat('date', { type: 'string', validate: dateFormatValidator })
	ajv.addFormat('asset', { type: 'string', validate: assetFormatValidator })
	ajv.addFormat('comma-separated', {
		type: 'string',
		validate: commaSeparatedFormatValidator,
	})
	ajv.addFormat('paragraph', { type: 'string', validate: paragraphValidator })

	return ajv.compile(schema)
}
