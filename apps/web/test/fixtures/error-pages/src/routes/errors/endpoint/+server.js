import { error } from '@sveltejs/kit'

export function GET() {
	error(503, 'Fixture endpoint unavailable')
}
