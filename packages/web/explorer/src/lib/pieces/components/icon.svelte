<script lang="ts">
	import {
		WebPieceIconSizes,
		type WebPieceIconProps,
		type WebPieceIconSizeName,
		type WebPieces
	} from '$lib/pieces/types'
	import Webpage from './icons/generic.svelte'
	import { page } from '$app/state'
	import type { Component } from 'svelte'
	import { getAssetPath } from '@luzzle/tools/browser'

	const iconComponents: Record<string, { default: Component }> = import.meta.glob(
		'$lib/pieces/components/icons/*/icon.svelte',
		{ eager: true }
	)

	type Props = {
		piece: WebPieces
		size?: WebPieceIconSizeName
		active?: boolean
		lazy?: boolean
	}

	let { piece, size = 's', active = false, lazy = false }: Props = $props()

	const icons: Record<string, { default: Component }> = {}

	for (const key in iconComponents) {
		if (key.endsWith(`${piece.type}/icon.svelte`)) {
			icons[piece.type] = iconComponents[key]
		}
	}

	const config = page.data.config
	const frontmatter = JSON.parse(piece.json_metadata || '{}') || {}
	const tags = JSON.parse(piece.keywords || '[]') || []
	const Icon = icons[piece.type]
	const helpers: WebPieceIconProps['helpers'] = {
		getPieceUrl: function () {
			return `${config.url.app}/pieces/${piece.type}/${piece.slug}`
		},
		getImageUrl: function (asset: string, format: 'jpg' | 'avif') {
			const path = getAssetPath(piece.type, piece.id, asset, {
				size: size,
				format
			})
			return `${config.url.luzzle_assets}/pieces/assets/${path}`
		},
		getIconScale: function (baselineWidth: number) {
			return Math.round((WebPieceIconSizes[size].width / baselineWidth) * 100) / 100
		}
	}
</script>

{#if Icon}
	<Icon.default
		piece={{ ...piece, frontmatter, tags }}
		icon={{ size: WebPieceIconSizes[size], active, lazy }}
		{helpers}
	/>
{:else}
	<Webpage
		piece={{ ...piece, frontmatter, tags }}
		icon={{ size: WebPieceIconSizes[size], active, lazy }}
		{helpers}
	/>
{/if}
