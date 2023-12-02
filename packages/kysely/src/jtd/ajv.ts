import Ajv, { FuncKeywordDefinition, JTDSchemaType, ValidateFunction } from 'ajv/dist/jtd.js'

const luzzleFormatKeyword: FuncKeywordDefinition = {
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

const luzzleEnumKeyword: FuncKeywordDefinition = {
	keyword: 'luzzleEnum',
	type: 'array',
}

const luzzlePatternKeyword: FuncKeywordDefinition = {
	keyword: 'luzzlePattern',
	type: 'string',
}

export default function <T>(schema: JTDSchemaType<T>): ValidateFunction<T> {
	return new Ajv({
		keywords: [luzzlePatternKeyword, luzzleFormatKeyword, luzzleEnumKeyword],
	}).compile(schema)
}

export { luzzleFormatKeyword, luzzleEnumKeyword, luzzlePatternKeyword }
