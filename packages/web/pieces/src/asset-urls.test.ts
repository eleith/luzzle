import { expect, test } from 'vitest'
import { encodeAssetPath, assetPathToUrl, previewOutputUrl } from './asset-urls.js'

test.each([
	null,
	undefined,
	'',
	' ',
	'../x',
	'a/../x',
	'.',
	'a/./x',
	'/x',
	'//host/x',
	'a//x',
	'https://host/x',
	'javascript:x',
	'images/mark\0.svg',
	'a\\x'
])('invalid recorded path %j remains unlinked', (path) => {
	expect(encodeAssetPath(path)).toBeUndefined()
	expect(assetPathToUrl(path, '/garden')).toBeUndefined()
})

test.each(['', '/garden/', 'https://cdn.test/prefix/?old=1#fragment'])(
	'public URL conversion still preserves base %s and encodes raw segments once',
	(base) => {
		const path = 'files/雪 #?%2e%2e <file>.pdf'
		const encoded = 'files/%E9%9B%AA%20%23%3F%252e%252e%20%3Cfile%3E.pdf'
		expect(encodeAssetPath(path)).toBe(encoded)
		const prefix = base.startsWith('https:') ? 'https://cdn.test/prefix' : base.replace(/\/$/, '')
		expect(assetPathToUrl(path, base)).toBe(`${prefix}/pieces/assets/${encoded}`)
	}
)

test.each(['job', 'selected job', 'job #?%', '仕事', '%2e%2e'])(
	'job %j uses the explicit root-mounted Admin asset route',
	(job) => {
		expect(previewOutputUrl('files/雪 #?%2e%2e.pdf', job)).toBe(
			`/admin/preview/${encodeURIComponent(job)}/asset/files/%E9%9B%AA%20%23%3F%252e%252e.pdf`
		)
	}
)

test.each(['out.png', 'nested/preview/admin/piece/file.txt', '%2e%2e/file%20name.pdf'])(
	'output %j is encoded once without interpreting filenames as routes',
	(path) => {
		expect(previewOutputUrl(path, 'job')).toBe(
			`/admin/preview/job/asset/${path.split('/').map(encodeURIComponent).join('/')}`
		)
	}
)

test.each([
	'../x',
	'a/../x',
	'/x',
	'//host/x',
	'https://host/x',
	'javascript:x',
	'x\\y',
	'',
	' ',
	'a//x',
	'a/./x'
])('unsafe output path %j never creates a Preview URL', (path) => {
	expect(previewOutputUrl(path, 'job')).toBeUndefined()
})

test.each(['', '.', '..', 'a/b', 'a\\b', ' ', 'https://host/job'])(
	'invalid job %j cannot alter the asset namespace',
	(job) => {
		expect(previewOutputUrl('out.png', job)).toBeUndefined()
	}
)
