import { Readable } from 'node:stream'
import { beforeEach, expect, test, vi } from 'vitest'
import { GET } from './+server'

const { realpath, stat, createReadStream } = vi.hoisted(() => ({
	realpath: vi.fn(),
	stat: vi.fn(),
	createReadStream: vi.fn()
}))
vi.mock('node:fs', () => ({
	default: { promises: { realpath, stat }, createReadStream }
}))
vi.mock('$lib/server/config', async () => {
	const { makeConfig } = await import('$lib/server/config.fixture')
	const config = makeConfig()
	config.paths.assets = '/site/assets'
	return { config }
})

const root = '/site/previews'
const job = 'job-123'
const base = `${root}/${job}`

function request(jobId: string | undefined, asset: string | undefined) {
	return GET({ params: { jobId, asset } } as Parameters<typeof GET>[0])
}

beforeEach(() => {
	vi.resetAllMocks()
	realpath.mockImplementation(async (file: string) => file)
	stat.mockResolvedValue({ isFile: () => true, size: 4 })
	createReadStream.mockImplementation(() => Readable.from([Buffer.from('safe')]))
})

// Params are already decoded by Kit; never decode literal percent sequences again.
test.each([
	[undefined, 'file.png'],
	['', 'file.png'],
	['.', 'file.png'],
	['..', 'file.png'],
	['../private', 'file.png'],
	['/private', 'file.png'],
	['nested/job', 'file.png'],
	['nested\\job', 'file.png'],
	['job\0', 'file.png'],
	[job, undefined],
	[job, ''],
	[job, '/private/file.png'],
	[job, '../job-123-extra/file.png'],
	[job, '../private/file.png'],
	[job, 'nested/../../private/file.png'],
	[job, 'nested/../file.png'],
	[job, './file.png'],
	[job, 'nested//file.png'],
	[job, 'nested\\file.png'],
	[job, 'file\0.png']
])('rejects invalid decoded job %j / asset %j before filesystem access', async (jobId, asset) => {
	const response = await request(jobId, asset)
	expect(response.status).toBe(403)
	expect(await response.text()).toBe('forbidden')
	expect(realpath).not.toHaveBeenCalled()
	expect(stat).not.toHaveBeenCalled()
	expect(createReadStream).not.toHaveBeenCalled()
})

test.each([
	[base, '/private/job-123'],
	[base, '/site/previews-extra/job-123'],
	[base, root],
	[`${base}/nested/file.png`, '/private/file.png'],
	[`${base}/nested/file.png`, `${root}/job-123-extra/file.png`],
	[`${base}/nested/file.png`, base]
])('rejects symlink resolution %s → %s before stat or streaming', async (from, to) => {
	realpath.mockImplementation(async (file: string) => (file === from ? to : file))
	const response = await request(job, 'nested/file.png')
	expect(response.status).toBe(403)
	expect(realpath).toHaveBeenCalledWith(from)
	expect(stat).not.toHaveBeenCalled()
	expect(createReadStream).not.toHaveBeenCalled()
})

test.each([
	['nested/image.png', 'image/png'],
	['nested/源 #?%.png', 'image/png'],
	['literal%2Fname.png', 'image/png'],
	['file.unknown-extension', 'application/octet-stream']
])('streams a contained regular file %s with unchanged headers', async (asset, mime) => {
	const response = await request(job, asset)
	expect(response.status).toBe(200)
	expect(await response.text()).toBe('safe')
	expect(response.headers.get('Content-Type')).toBe(mime)
	expect(response.headers.get('Content-Length')).toBe('4')
	expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
	expect(realpath.mock.calls).toEqual([[root], [base], [`${base}/${asset}`]])
	expect(stat).toHaveBeenCalledExactlyOnceWith(`${base}/${asset}`)
	expect(createReadStream).toHaveBeenCalledExactlyOnceWith(`${base}/${asset}`)
})

test('supports a relocated Preview root and an in-job symlink, opening the resolved file', async () => {
	const realRoot = '/storage/previews'
	const realBase = `${realRoot}/${job}`
	const resolved = `${realBase}/nested/actual.bin`
	const paths = new Map([
		[root, realRoot],
		[base, realBase],
		[`${base}/image.png`, resolved]
	])
	realpath.mockImplementation(async (file: string) => paths.get(file) ?? file)
	const response = await request(job, 'image.png')
	expect(response.status).toBe(200)
	expect(await response.text()).toBe('safe')
	expect(response.headers.get('Content-Type')).toBe('image/png')
	expect(stat).toHaveBeenCalledExactlyOnceWith(resolved)
	expect(createReadStream).toHaveBeenCalledExactlyOnceWith(resolved)
})

test.each(['root', 'job', 'asset', 'stat'] as const)(
	'missing or inaccessible %s retains the existing not-found response',
	async (stage) => {
		if (stage === 'stat') stat.mockRejectedValue(new Error('inaccessible'))
		else {
			const missing = { root, job: base, asset: `${base}/image.png` }[stage]
			realpath.mockImplementation(async (file: string) => {
				if (file === missing) throw new Error('inaccessible')
				return file
			})
		}
		const response = await request(job, 'image.png')
		expect(response.status).toBe(404)
		expect(await response.text()).toBe('not found')
		expect(createReadStream).not.toHaveBeenCalled()
	}
)

test('directories are not streamed', async () => {
	stat.mockResolvedValue({ isFile: () => false })
	expect((await request(job, 'nested')).status).toBe(404)
	expect(createReadStream).not.toHaveBeenCalled()
})
