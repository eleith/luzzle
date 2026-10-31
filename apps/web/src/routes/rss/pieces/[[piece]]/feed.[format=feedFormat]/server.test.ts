import { beforeEach, expect, test, vi } from 'vitest'
import { GET } from './+server'

const { config, getPiecesForFeed } = vi.hoisted(() => ({
	config: {
		pieces: [{ type: 'field-notes' }, { type: 'specimens' }],
		content: { text: { title: 'Garden', description: 'Field observations' } },
		url: { app: 'https://app.example', app_assets: 'https://assets.example' }
	},
	getPiecesForFeed: vi.fn()
}))
vi.mock('#lib/server/config.js', () => ({ config }))
vi.mock('#lib/feeds/utils.js', () => ({ getPiecesForFeed }))

function event(type: string | undefined, format: string) {
	return { params: { piece: type, format } } as Parameters<typeof GET>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	getPiecesForFeed.mockResolvedValue([
		{
			id: 'note',
			type: config.pieces[0].type,
			slug: 'observation',
			title: 'Observation',
			note: 'A field note',
			date_added: 1700000000000
		}
	])
})

const formats = [
	['json', 'application/json'],
	['xml', 'application/xml'],
	['md', 'text/markdown']
] as const

test.each(formats)('%s feeds accept every runtime-configured type', async (format, contentType) => {
	for (const { type } of config.pieces) {
		const response = await GET(event(type, format))
		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe(contentType)
		expect(await response.text()).toContain('Observation')
		expect(getPiecesForFeed).toHaveBeenLastCalledWith(type)
	}
})

test.each(formats)('%s feeds still support all pieces', async (format, contentType) => {
	const response = await GET(event(undefined, format))
	expect(response.status).toBe(200)
	expect(response.headers.get('content-type')).toBe(contentType)
	expect(getPiecesForFeed).toHaveBeenCalledExactlyOnceWith(undefined)
})

test.each(formats)('%s rejects unknown types before collecting feed pieces', async (format) => {
	await expect(GET(event('unconfigured', format))).rejects.toMatchObject({ status: 404 })
	expect(getPiecesForFeed).not.toHaveBeenCalled()
})
