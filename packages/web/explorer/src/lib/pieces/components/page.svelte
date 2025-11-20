<script lang="ts">
	import type { Component } from 'svelte'
	import {
		getImageAssetPath,
		type PieceComponentHelpers,
		type WebPieces,
		type PiecePageProps
	} from '@luzzle/web.utils'
	import PageDefault from '$lib/pieces/components/page.default.svelte'
	import { page } from '$app/state'

	const customPageMap = new Map<string, { default: Component<PiecePageProps> }>()
	const customComponents: Record<string, { default: Component }> = import.meta.glob(
		'$lib/pieces/components/custom/*/page.svelte',
		{ eager: true }
	)

	for (const customPath in customComponents) {
		const parts = customPath.split('/')
		const type = parts.at(-2)

		if (type) {
			customPageMap.set(type, customComponents[customPath])
		}
	}

	type Props = {
		piece: WebPieces
		metadata: Record<string, unknown>
		tags: Array<{ slug: string; tag: string }>
		html_note: string | null
	}

	let { piece, metadata, tags, html_note }: Props = $props()
	const Page = $derived(customPageMap.get(piece.type)?.default || PageDefault)
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

<Page {piece} {metadata} {tags} {html_note} {helpers} />
