import { Facet } from '@codemirror/state'

export const backLinkConfig = Facet.define<string, string>({
	combine: (values) => values[0] || ''
})
