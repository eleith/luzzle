<script lang="ts">
	import './ViewerBar.css'
	import { page } from '$app/state'
	import ArrowLeftIcon from 'virtual:icons/ph/arrow-left'
	import { resolve } from '$app/paths'
	import { encodeArchivePath } from '#lib/pieces/navigation.js'

	let { file }: { file: string } = $props()
	const path = $derived(encodeArchivePath(file))
	const publishedRoute = '/(auth)/admin/piece/[...path]/published'
</script>

<header class="viewer-bar">
	<a
		href={resolve('/(auth)/admin/piece/[...path]/source', { path })}
		class="viewer-bar-back"
		aria-label="Back to editor"
		title="Back to editor"
	>
		<ArrowLeftIcon aria-hidden="true" focusable="false" />
	</a>
	<nav class="viewer-bar-links" aria-label="Published views">
		<a
			class="viewer-bar-link"
			href={resolve(publishedRoute, { path })}
			aria-current={page.route.id === publishedRoute ? 'page' : undefined}>Overview</a
		>
		<a
			class="viewer-bar-link"
			href={resolve(`${publishedRoute}/page`, { path })}
			aria-current={page.route.id === `${publishedRoute}/page` ? 'page' : undefined}>Page</a
		>
		<a
			class="viewer-bar-link"
			href={resolve(`${publishedRoute}/icon`, { path })}
			aria-current={page.route.id === `${publishedRoute}/icon` ? 'page' : undefined}>Icon</a
		>
		<a
			class="viewer-bar-link"
			href={resolve(`${publishedRoute}/share`, { path })}
			aria-current={page.route.id === `${publishedRoute}/share` ? 'page' : undefined}>Share</a
		>
	</nav>
	<span class="viewer-bar-label">Published</span>
</header>
