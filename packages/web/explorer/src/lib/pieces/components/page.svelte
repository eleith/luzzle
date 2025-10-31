<script lang="ts">
	import type { Component } from 'svelte'
	import { type PieceComponentHelpers, type WebPieces } from '@luzzle/tools/types'
	import PageDefault from '$lib/pieces/components/page.default.svelte'
	import Icon from '$lib/pieces/components/icon.svelte'
	import { page } from '$app/state'
	import { getImageAssetPath } from '@luzzle/tools/browser'

	type PageProps = {
		piece: WebPieces
		tags: Array<{ slug: string; tag: string }>
		metadata: Record<string, unknown>
		html_note: string | null
		helpers: PieceComponentHelpers
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
		html_note: string | null
	}

	let { piece, metadata, tags, html_note }: Props = $props()
	const PageComponent = $derived(pageComponentMap.get(piece.type)?.default || PageDefault)
	const helpers: PieceComponentHelpers = {
		getPieceUrl: function () {
			return `${page.data.config.url.app}/pieces/${piece.type}/${piece.slug}`
		},
		getPieceImageUrl: function (asset: string, width: number, format: 'jpg' | 'avif') {
			const path = getImageAssetPath(piece.type, piece.id, asset, width, format)
			return `${page.data.config.url.luzzle_assets}/pieces/assets/${path}`
		}
	}
</script>

<PageComponent {piece} {Icon} {metadata} {tags} {html_note} {helpers} />
