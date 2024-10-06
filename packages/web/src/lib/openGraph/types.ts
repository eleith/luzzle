/* eslint-disable @typescript-eslint/no-explicit-any */
interface VNode {
	type: string
	props: {
		style?: Record<string, any>
		children?: string | VNode | VNode[]
		[prop: string]: any
	}
	key: string | null
}

type ComponentToJsxOptions = {
	props?: Record<string, any>
	style?: string // Internal CSS: Svelte has removed css from component render output
}

export { type VNode, type ComponentToJsxOptions }
