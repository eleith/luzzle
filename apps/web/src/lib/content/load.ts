import type { Component } from 'svelte'

export default function load<Props extends Record<string, any> = any>(
	file: string,
	defaultComponent: Component<Props, any, any>,
	glob: Record<string, unknown>
): Component<Props, any, any> {
	const customPageMap = new Map<string, { default: Component<Props, any, any> }>()

	for (const customPath in glob) {
		const parts = customPath.split('/').at(-1)?.split('.')
		const type = parts?.[1]

		if (parts?.[0] === file && type === 'svelte') {
			customPageMap.set(file, glob[customPath] as { default: Component<Props, any, any> })
		}
	}

	return customPageMap.get(file)?.default || defaultComponent
}
