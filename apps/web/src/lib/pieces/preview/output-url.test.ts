import { expect, test } from 'vitest'
import { previewOutputUrl } from './output-url'

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
