<script lang="ts">
	import './ViewerBar.css'
	import { page } from '$app/state'
	import ArrowLeftIcon from 'virtual:icons/ph/arrow-left'
	import type { PieceLinks } from '#lib/pieces/navigation.js'

	let { links }: { links: PieceLinks } = $props()
	const tabs = $derived(
		(['overview', 'page', 'icon', 'share'] as const).map((tab) => ({
			label: tab[0].toUpperCase() + tab.slice(1),
			href: links[tab]
		}))
	)
</script>

<header class="viewer-bar">
	<a href={links.source} class="viewer-bar-back" aria-label="Back to editor" title="Back to editor">
		<ArrowLeftIcon aria-hidden="true" focusable="false" />
	</a>
	<nav class="viewer-bar-links" aria-label="Published views">
		{#each tabs as tab (tab.label)}
			<a
				class="viewer-bar-link"
				href={tab.href}
				aria-current={page.url.pathname.replace(/\/$/, '') ===
				new URL(tab.href, page.url.href).pathname
					? 'page'
					: undefined}>{tab.label}</a
			>
		{/each}
	</nav>
	<span class="viewer-bar-label">Published</span>
</header>
