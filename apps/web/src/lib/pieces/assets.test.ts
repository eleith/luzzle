import { expect, test } from 'vitest'
import { encodeAssetPath, assetPathToUrl } from './assets'

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
