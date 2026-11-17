import { building } from '$app/env'
import { defineEnvVars } from '@sveltejs/kit/env'

function templateNames(value: string | undefined, kind: 'page' | 'icon'): Record<string, string> {
	// Tooling needs the contract, not the deployment's YAML or credentials.
	if (building) return {}
	if (value === undefined) {
		throw new Error('Missing routing configuration; start the app through its launcher.')
	}
	try {
		const templates: unknown = JSON.parse(value)
		if (
			templates !== null &&
			typeof templates === 'object' &&
			!Array.isArray(templates) &&
			Object.values(templates).every((name) => typeof name === 'string')
		) {
			return templates as Record<string, string>
		}
	} catch {
		// Report the contract without echoing potentially sensitive input.
	}
	throw new Error(`Expected a JSON object mapping piece types to ${kind} template names.`)
}

export const variables = defineEnvVars({
	LUZZLE_PAGE_TEMPLATES: {
		public: true,
		static: false,
		description: 'Public type-to-template names generated from YAML by the server launcher.',
		schema: (value) => templateNames(value, 'page')
	},
	LUZZLE_ICON_TEMPLATES: {
		public: true,
		static: false,
		description: 'Public type-to-icon names generated from YAML by the server launcher.',
		schema: (value) => templateNames(value, 'icon')
	}
})
