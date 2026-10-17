import { expect, test } from 'vitest'
import { localRedirect } from './redirect'

const origin = 'https://app.example'

test.each([
	['/admin', '/admin'],
	[
		'/garden/admin/publish?view=failed&page=2#jobs',
		'/garden/admin/publish?view=failed&page=2#jobs'
	],
	['https://app.example/admin?tag=a%26b#details', '/admin?tag=a%26b#details'],
	['//app.example/admin', '/admin'],
	[
		'/admin/piece/books/源%20%23%3F%25.md/source',
		'/admin/piece/books/%E6%BA%90%20%23%3F%25.md/source'
	],
	[
		'/admin/piece/literal%252F.md/source?filter=a+b',
		'/admin/piece/literal%252F.md/source?filter=a+b'
	],
	['/%2Fexternal.example', '/%2Fexternal.example']
])('normalizes the local destination %s without decoding it again', (value, expected) => {
	expect(localRedirect(value, origin)).toBe(expected)
})

test.each([
	null,
	'',
	'https://external.example/admin',
	'//external.example/admin',
	'///external.example/admin',
	'/\\external.example/admin',
	'\\\\external.example/admin',
	'http://app.example/admin',
	'https://app.example:444/admin',
	'https://app.example.external.example/admin',
	'https://app.example@external.example/admin',
	'javascript:alert(1)',
	'data:text/html,hello',
	'blob:https://app.example/admin',
	'blob:https:app.example/admin',
	'https://[invalid',
	'\t//external.example',
	'/\n/external.example',
	'https://app.example//external.example/admin',
	'https://app.example/\\external.example/admin',
	'/admin/..//external.example/admin'
])('falls back for the missing, malformed, or unsafe destination %j', (value) => {
	expect(localRedirect(value, origin)).toBe('/admin')
})
