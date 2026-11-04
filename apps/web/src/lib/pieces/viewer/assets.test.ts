import { expect, test, vi } from 'vitest'
import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
import { groupAssetOutputs, groupOutputRows, type OutputFile, type OutputValue } from './assets'

const fileUrl = (path: string) => `/files/${path}`

test('groups recorded outputs by producer namespace without hiding unfamiliar producers', () => {
	const original: PublicWebPieceAsset = {
		asset_key: 'cover',
		transformation: 'image.original',
		asset_path: 'cover.jpg',
		mime_type: 'image/jpeg'
	}
	const thumbnail = {
		...original,
		transformation: 'image.s.webp',
		asset_path: 'small.webp',
		mime_type: 'image/webp'
	}
	const exported: PublicWebPieceAsset = {
		asset_key: 'document',
		transformation: 'document.export',
		asset_path: 'document.pdf',
		mime_type: 'application/pdf'
	}

	const grouped = groupAssetOutputs([original, exported, thumbnail], fileUrl)

	expect(grouped.transforms.map((family) => family.name)).toEqual(['image', 'document'])
	expect(grouped.transforms[0].files).toMatchObject([
		{ key: 'cover', label: 'image.original', path: 'cover.jpg' },
		{ key: 'cover', label: 'image.s.webp', path: 'small.webp' }
	])
	expect(grouped.transforms[1].files).toMatchObject([
		{ key: 'document', label: 'document.export', path: 'document.pdf' }
	])
})

test('removes exact replayed records without merging distinct assets, outputs or source values', () => {
	const first: PublicWebPieceAsset = {
		asset_key: 'first-snippet',
		transformation: 'highlight',
		asset_path: 'source.js',
		mime_type: 'text/plain',
		content: 'first source'
	}
	const secondAsset = { ...first, asset_key: 'second-snippet' }
	const secondOutput = { ...first, transformation: 'highlight.metadata' }
	const secondValue = { ...first, content: 'second source' }
	const secondMime = { ...first, mime_type: 'text/html' }

	const grouped = groupAssetOutputs(
		[first, first, secondAsset, secondOutput, secondValue, secondMime],
		fileUrl
	)

	expect(grouped.transforms[0].files).toHaveLength(5)
	expect(grouped.transforms[0].values).toMatchObject([
		{ key: 'first-snippet', output: 'highlight', value: 'first source', mime: 'text/plain' },
		{ key: 'second-snippet', output: 'highlight', value: 'first source', mime: 'text/plain' },
		{
			key: 'first-snippet',
			output: 'highlight.metadata',
			value: 'first source',
			mime: 'text/plain'
		},
		{ key: 'first-snippet', output: 'highlight', value: 'second source', mime: 'text/plain' },
		{ key: 'first-snippet', output: 'highlight', value: 'first source', mime: 'text/html' }
	])
})

test('retains both the recorded file and whole inline source without parsing the source', () => {
	const output: PublicWebPieceAsset = {
		asset_key: 'metadata',
		transformation: 'markdown.metadata',
		asset_path: 'metadata.json',
		mime_type: 'application/json',
		content: '{broken JSON <script>literal source</script>'
	}

	const grouped = groupAssetOutputs([output], fileUrl)

	expect(grouped.transforms[0].files).toMatchObject([
		{ path: 'metadata.json', url: '/files/metadata.json' }
	])
	expect(grouped.transforms[0].values).toEqual([
		{
			key: 'metadata',
			output: 'markdown.metadata',
			field: 'Content',
			mime: 'application/json',
			value: output.content
		}
	])
})

test('distinguishes missing files, missing embedded values, empty source and literal JSON null', () => {
	const missingFile: PublicWebPieceAsset = {
		asset_key: 'missing-file',
		transformation: 'palette',
		asset_path: null,
		mime_type: 'application/json'
	}
	const missingValue = { ...missingFile, asset_key: 'missing-value', is_embedded: 1 as const }
	const empty = { ...missingValue, asset_key: 'empty', content: '' }
	const jsonNull = { ...missingValue, asset_key: 'json-null', content: 'null' }
	const whitespace = { ...missingValue, asset_key: 'whitespace', content: ' \r\n ' }

	const grouped = groupAssetOutputs(
		[missingFile, missingValue, empty, jsonNull, whitespace],
		fileUrl
	)

	expect(grouped.transforms[0].files).toMatchObject([
		{ key: 'missing-file', path: null, url: undefined }
	])
	expect(grouped.transforms[0].values.map(({ key, value }) => ({ key, value }))).toEqual([
		{ key: 'missing-value', value: null },
		{ key: 'empty', value: '' },
		{ key: 'json-null', value: 'null' },
		{ key: 'whitespace', value: ' \r\n ' }
	])
})

test('only usable raw paths reach the URL callback, without discarding unavailable records', () => {
	const available: PublicWebPieceAsset = {
		asset_key: 'available',
		transformation: 'attachment',
		asset_path: 'files/雪 #?%.pdf',
		mime_type: 'application/pdf'
	}
	const unavailable = { ...available, asset_key: 'unavailable', asset_path: 'unavailable.pdf' }
	const unsafe = { ...available, asset_key: 'unsafe', asset_path: '../private.pdf' }
	const previewUrl = '/admin/preview/current-job/asset/recorded.pdf'
	const resolveFile = vi.fn((path: string) =>
		path === available.asset_path ? previewUrl : undefined
	)

	const grouped = groupAssetOutputs([available, unavailable, unsafe], resolveFile)

	expect(resolveFile).toHaveBeenCalledWith(available.asset_path)
	expect(resolveFile).toHaveBeenCalledWith(unavailable.asset_path)
	expect(resolveFile).not.toHaveBeenCalledWith(unsafe.asset_path)
	expect(grouped.transforms[0].files).toMatchObject([
		{ key: 'available', path: available.asset_path, url: previewUrl },
		{ key: 'unavailable', path: 'unavailable.pdf', url: undefined },
		{ key: 'unsafe', path: '../private.pdf', url: undefined }
	])
})

test('file and value rows follow the original asset order rather than file-first projection order', () => {
	const firstFile: OutputFile = {
		key: 'first-cover',
		label: 'image.original',
		path: 'first.jpg',
		mime: 'image/jpeg',
		url: '/files/first.jpg'
	}
	const secondFile = {
		...firstFile,
		key: 'second-cover',
		path: 'second.jpg',
		url: '/files/second.jpg'
	}
	const firstValue: OutputValue = {
		key: 'first-cover',
		output: 'image.note',
		field: 'Content',
		mime: 'text/plain',
		value: 'First cover note'
	}
	const assetOrder = new Map([
		['first-cover', 1],
		['second-cover', 2]
	])

	const groups = groupOutputRows([secondFile, firstFile, firstValue], assetOrder)

	expect(groups).toEqual([
		{ key: 'first-cover', items: [firstFile, firstValue] },
		{ key: 'second-cover', items: [secondFile] }
	])
})
