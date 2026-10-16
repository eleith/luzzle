import path from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { GET } from './+server'

const { realpath, stat, createReadStream } = vi.hoisted(() => ({
	realpath: vi.fn(),
	stat: vi.fn(),
	createReadStream: vi.fn()
}))
vi.mock('node:fs', () => ({
	default: { promises: { realpath, stat }, createReadStream }
}))

const root = path.resolve('assets/pieces')

function request(asset: string | undefined) {
	return GET({ params: { path: asset } } as Parameters<typeof GET>[0])
}

beforeEach(() => {
	vi.resetAllMocks()
	vi.spyOn(console, 'log').mockImplementation(() => {})
	realpath.mockImplementation(async (file: string) => file)
	stat.mockResolvedValue({ isFile: () => true, size: 4 })
	createReadStream.mockImplementation(() => Readable.from([Buffer.from('safe')]))
})
afterEach(() => vi.restoreAllMocks())

test.each([
	undefined,
	'',
	'.',
	'..',
	'/outside/file.png',
	'../pieces-backup/file.png',
	'../private/file.png',
	'nested/../../private/file.png',
	'nested/../file.png',
	'./file.png',
	'nested//file.png',
	'nested\\file.png',
	'file\0.png'
])('rejects invalid decoded asset %j before filesystem access', async (asset) => {
	const response = await request(asset)
	expect(response.status).toBe(403)
	expect(await response.text()).toBe('forbidden')
	expect(realpath).not.toHaveBeenCalled()
	expect(stat).not.toHaveBeenCalled()
	expect(createReadStream).not.toHaveBeenCalled()
})

test.each(['/outside/file.png', `${root}-backup/file.png`, root])(
	'rejects symlink target %s outside the asset directory before stat or streaming',
	async (target) => {
		const asset = `${root}/nested/file.png`
		realpath.mockImplementation(async (file: string) => (file === asset ? target : file))
		const response = await request('nested/file.png')
		expect(response.status).toBe(403)
		expect(realpath.mock.calls).toEqual([[root], [asset]])
		expect(stat).not.toHaveBeenCalled()
		expect(createReadStream).not.toHaveBeenCalled()
	}
)

test.each([
	['nested/image.png', 'image/png'],
	['nested/源 #?%.png', 'image/png'],
	['literal%2Fname.png', 'image/png'],
	['file.unknown-extension', 'application/octet-stream']
])('streams contained asset %s without changing MIME or cache headers', async (asset, mime) => {
	const response = await request(asset)
	expect(response.status).toBe(200)
	expect(await response.text()).toBe('safe')
	expect(response.headers.get('Content-Type')).toBe(mime)
	expect(response.headers.get('Content-Length')).toBe('4')
	expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
	expect(realpath.mock.calls).toEqual([[root], [`${root}/${asset}`]])
	expect(stat).toHaveBeenCalledExactlyOnceWith(`${root}/${asset}`)
	expect(createReadStream).toHaveBeenCalledExactlyOnceWith(`${root}/${asset}`)
})

test('supports a relocated asset root and an in-root symlink, reading the resolved target', async () => {
	const realRoot = '/storage/pieces'
	const resolved = `${realRoot}/nested/actual.bin`
	const paths = new Map([
		[root, realRoot],
		[`${root}/image.png`, resolved]
	])
	realpath.mockImplementation(async (file: string) => paths.get(file) ?? file)
	const response = await request('image.png')
	expect(response.status).toBe(200)
	expect(await response.text()).toBe('safe')
	expect(response.headers.get('Content-Type')).toBe('image/png')
	expect(stat).toHaveBeenCalledExactlyOnceWith(resolved)
	expect(createReadStream).toHaveBeenCalledExactlyOnceWith(resolved)
})

test.each(['root', 'asset', 'stat', 'stream'] as const)(
	'missing or inaccessible %s retains the existing logged not-found response',
	async (stage) => {
		if (stage === 'stat') stat.mockRejectedValue(new Error('inaccessible'))
		else if (stage === 'stream')
			createReadStream.mockImplementation(() => {
				throw new Error('inaccessible')
			})
		else {
			const missing = stage === 'root' ? root : `${root}/image.png`
			realpath.mockImplementation(async (file: string) => {
				if (file === missing) throw new Error('inaccessible')
				return file
			})
		}
		const response = await request('image.png')
		expect(response.status).toBe(404)
		expect(await response.text()).toBe('not found')
		expect(console.log).toHaveBeenCalledOnce()
		if (stage !== 'stream') expect(createReadStream).not.toHaveBeenCalled()
	}
)

test('directories are not streamed', async () => {
	stat.mockResolvedValue({ isFile: () => false })
	expect((await request('nested')).status).toBe(404)
	expect(createReadStream).not.toHaveBeenCalled()
})
