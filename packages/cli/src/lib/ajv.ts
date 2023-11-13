import Ajv from 'ajv/dist/jtd.js'

const formatKeyword: Ajv.FuncKeywordDefinition = {
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

const attachmentTypeKeyword: Ajv.FuncKeywordDefinition = {
	keyword: 'luzzleAttachmentType',
	type: 'array',
}

export default new Ajv.default({
	keywords: [formatKeyword, attachmentTypeKeyword],
})

export { formatKeyword, attachmentTypeKeyword }
