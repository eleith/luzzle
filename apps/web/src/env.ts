import { building } from '$app/env'
import { defineEnvVars } from '@sveltejs/kit/env'

function isPageTemplateNameMap(value: unknown): value is Record<string, string> {
	return (
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.values(value).every((name) => typeof name === 'string')
	)
}

export const variables = defineEnvVars({
	LUZZLE_PAGE_TEMPLATES: {
		public: true,
		static: false,
		description: 'Public type-to-template names generated from YAML by the server launcher.',
		schema(value): Record<string, string> {
			// Tooling needs the contract, not the deployment's YAML or credentials.
			if (building) return {}
			if (value === undefined) {
				throw new Error('Missing routing configuration; start the app through its launcher.')
			}
			try {
				const templates: unknown = JSON.parse(value)
				if (isPageTemplateNameMap(templates)) return templates
			} catch {
				// Report the contract without echoing potentially sensitive input.
			}
			throw new Error('Expected a JSON object mapping piece types to page template names.')
		}
	}
})
