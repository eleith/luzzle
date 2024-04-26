import Ajv, { ValidateFunction, JSONSchemaType } from 'ajv'

export function luzzleDateFormatValidator(data: string) {
	return !isNaN(Date.parse(data))
}

export function luzzleAssetFormatValidator(data: string) {
	return /^\.assets\/.+\/.+/.test(data)
}

export default function <T>(schema: JSONSchemaType<T>): ValidateFunction<T> {
	const ajv = new Ajv.default()

	ajv.addFormat('date', { type: 'string', validate: luzzleDateFormatValidator })
	ajv.addFormat('asset', { type: 'string', validate: luzzleAssetFormatValidator })

	return ajv.compile(schema)
}
