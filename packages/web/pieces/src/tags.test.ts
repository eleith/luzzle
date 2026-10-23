import { expect, test } from 'vitest'
import { getPieceTags } from './index.js'

test('reads normalized tag JSON without coupling an icon to archive field names', () => {
	expect(getPieceTags('["puzzle","cooperative"]')).toEqual(['puzzle', 'cooperative'])
	expect(getPieceTags('["puzzle",1,null]')).toEqual(['puzzle'])
	expect(getPieceTags()).toEqual([])
	expect(getPieceTags('invalid')).toEqual([])
	expect(getPieceTags('{}')).toEqual([])
})
