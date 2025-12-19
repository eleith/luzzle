import type { Component } from 'svelte'

export default function load(
	file: string,
	defaultComponent: Component,
	glob: Record<string, unknown>
) {
	const customPageMap = new Map<string, { default: Component }>()

	for (const customPath in glob) {
		const parts = customPath.split('/').at(-1)?.split('.')
		const type = parts?.[1]

		if (parts?.[0] === file && type === 'svelte') {
			customPageMap.set(file, glob[customPath] as { default: Component })
		}
	}

	return customPageMap.get(file)?.default || defaultComponent
}
