import type { Component } from 'svelte'

export default function load<Props extends Record<string, unknown> = Record<string, unknown>>(
	file: string,
	defaultComponent: Component<Props>,
	glob: Record<string, unknown>
): Component<Props> {
	const customPageMap = new Map<string, { default: Component<Props> }>()

	for (const customPath in glob) {
		const parts = customPath.split('/').at(-1)?.split('.')
		const type = parts?.[1]

		if (parts?.[0] === file && type === 'svelte') {
			customPageMap.set(file, glob[customPath] as { default: Component<Props> })
		}
	}

	return customPageMap.get(file)?.default || defaultComponent
}
