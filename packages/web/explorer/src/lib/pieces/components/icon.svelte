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

	const iconComponentMap = new Map<string, { default: Component }>()
	for (const path in iconComponents) {
		const type = path.split('/').at(-2)
		if (type) {
			iconComponentMap.set(type, iconComponents[path])
		}
	}

	type Props = {
		piece: WebPieces
		size?: WebPieceIconSizeName
		active?: boolean
		lazy?: boolean
	}

	let { piece, size = 's', active = false, lazy = false }: Props = $props()

	const config = page.data.config
	const frontmatter = $derived(JSON.parse(piece.json_metadata || '{}') || {})
	const tags = $derived(JSON.parse(piece.keywords || '[]') || [])
	const Icon = $derived(iconComponentMap.get(piece.type))
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
