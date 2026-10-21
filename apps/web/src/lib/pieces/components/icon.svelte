<script lang="ts">
	import { page } from '$app/state'
	import type { Component } from 'svelte'
	import type { PublicWebPiece } from '@luzzle/web.pieces'
	import type { PieceIconProps } from '@luzzle/web.templates/pieces/props'
	import IconDefault from '$lib/pieces/components/icon.default.svelte'
	import { getPieceHelpers } from '$lib/pieces/helpers.js'
	import { assetPathToUrl, staticAssetPathToUrl } from '$lib/pieces/assets.js'
	import { previewOutputUrl } from '$lib/pieces/preview/output-url.js'
	import { createTemplateHelpers } from '$lib/pieces/template-helpers.js'

	const iconImports = import.meta.glob<{ default: Component<PieceIconProps> }>(
		'$lib/pieces/components/custom/*/icon.svelte'
	)

	const iconImportMap = new Map<string, () => Promise<{ default: Component<PieceIconProps> }>>()
	for (const path in iconImports) {
		const type = path.split('/').at(-2)
		if (type) {
			iconImportMap.set(type, iconImports[path])
		}
	}

	type Props = {
		active?: boolean
		lazy?: boolean
		piece: PublicWebPiece
		size: { width: number; height?: number }
	}

	let { piece, lazy = false, size, active = false }: Props = $props()

	const tags = $derived(JSON.parse(piece.keywords || '[]')) as string[]
	const width = $derived(size.width)
	const height = $derived(size.height ? size.height : (width * 3) / 2)
	const legacyHelpers = $derived(getPieceHelpers(piece))
	const helpers = $derived.by(() => {
		const { config, preview, job } = page.data
		if (preview === true && !job) throw new Error('Preview rendering requires a job.')
		return createTemplateHelpers({
			buildPieceUrl: (source) =>
				`${config.url.app.replace(/\/+$/, '')}/pieces/${encodeURIComponent(source.type)}/${encodeURIComponent(source.slug)}`,
			buildAssetUrl: (path) =>
				preview === true
					? previewOutputUrl(path, job!)
					: assetPathToUrl(path, config.url.luzzle_assets || config.url.app),
			buildStaticAssetUrl: (relativePath) =>
				staticAssetPathToUrl(relativePath, config.url.app_assets)
		})
	})
	const options = $derived({ size: { width, height }, lazy, active })

	async function resolveIcon(type: string): Promise<Component<PieceIconProps> | undefined> {
		const importer = iconImportMap.get(type)
		if (!importer) return undefined
		try {
			const mod = await importer()
			return mod.default
		} catch {
			return undefined
		}
	}

	const IconComponent = $derived(await resolveIcon(piece.type))
</script>

{#key piece}
	{#if IconComponent}
		<IconComponent data={{ piece }} {options} {helpers} />
	{:else}
		<IconDefault {piece} {tags} size={{ width, height }} {lazy} {active} helpers={legacyHelpers} />
	{/if}
{/key}
