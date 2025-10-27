<script lang="ts">
	import type { Component } from 'svelte'
	import { type WebPieces } from '@luzzle/tools/types'
	import PageDefault from '$lib/pieces/components/page.default.svelte'
	import Icon from '$lib/pieces/components/icon.svelte'

	type PageProps = {
		piece: WebPieces
		tags: Array<{ slug: string; tag: string }>
		metadata: Record<string, unknown>
		html: {
			note: string | null
			summary: string | null
		}
		Icon: typeof Icon
	}

	const pageComponentMap = new Map<string, { default: Component<PageProps> }>()
	const pageComponents: Record<string, { default: Component }> = import.meta.glob(
		'$lib/pieces/components/custom/*/page.svelte',
		{ eager: true }
	)

	for (const path in pageComponents) {
		const type = path.split('/').at(-2)
		if (type) {
			pageComponentMap.set(type, pageComponents[path])
		}
	}

	type Props = {
		piece: WebPieces
		metadata: Record<string, unknown>
		tags: Array<{ slug: string; tag: string }>
		html: {
			note: string | null
			summary: string | null
		}
	}

	let { piece, metadata, tags, html }: Props = $props()
	const PageComponent = $derived(pageComponentMap.get(piece.type)?.default || PageDefault)
</script>

<PageComponent {piece} {Icon} {metadata} {tags} {html} />
