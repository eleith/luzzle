import { error } from '@sveltejs/kit'

export function load({ params }) {
	if (params.kind === 'unknown') throw new Error('Fixture private failure: /private/fixture-secret')
	const status = Number(params.kind)
	if ([400, 403, 404, 500, 503].includes(status)) error(status, `Fixture expected ${status}`)
	error(404, 'Unknown fixture error kind')
}

export const actions = {
	default() {
		error(403, 'Fixture action denied')
	}
}
