import { expect, test, vi } from 'vitest'
import editorSchema from '@luzzle/web.templates/config.schema.json' with { type: 'json' }
import { GET } from './+server.js'

vi.mock('#lib/server/config.js', () => {
	throw new Error('The schema endpoint must not read instance configuration')
})

test('serves the bundled editor schema with schema content type and revalidation', async () => {
	const response = GET()

	expect(response.status).toBe(200)
	expect(response.headers.get('content-type')).toBe('application/schema+json; charset=utf-8')
	expect(response.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate')
	expect(await response.json()).toEqual(editorSchema)
})
