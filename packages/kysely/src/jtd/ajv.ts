import Ajv, { FuncKeywordDefinition, JTDSchemaType, ValidateFunction } from 'ajv/dist/jtd.js'

const formatKeyword: FuncKeywordDefinition = {
	keyword: 'luzzleFormat',
	type: 'string',
	validate: function validate(schema: string, data: string) {
		const validation = validate as unknown as { errors: unknown[] }
		validation.errors = []

		if (schema === 'date-string') {
			const valid = !isNaN(new Date(data) as unknown as number)

			if (!valid) {
				validation.errors.push({ message: `'${data}' is not a valid date string` })
				return false
			}

			return true
		}

		return false
	},
	errors: true,
}

const attachmentTypeKeyword: FuncKeywordDefinition = {
	keyword: 'luzzleAttachmentType',
	type: 'array',
}

export default function <T>(schema: JTDSchemaType<T>): ValidateFunction<T> {
	return new Ajv({
		keywords: [formatKeyword, attachmentTypeKeyword],
	}).compile(schema)
}

export { formatKeyword, attachmentTypeKeyword }
