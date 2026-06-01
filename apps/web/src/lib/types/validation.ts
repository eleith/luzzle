export interface ValidationError {
	message: string
	source: 'frontmatter' | 'markdown'

	path?: string
	keyword?: string
	params?: Record<string, unknown>

	line?: number
	column?: number
	ruleId?: string
}

export interface ValidationResponse {
	valid: boolean
	errors: ValidationError[]
	debug?: {
		markdownLength: number
		timestamp: number
	}
}
