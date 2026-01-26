<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import FolderIcon from 'virtual:icons/ph/folder'
	import PenIcon from 'virtual:icons/ph/pen'
	import PlusIcon from 'virtual:icons/ph/plus'
	import { page } from '$app/state'

	const { children } = $props()
</script>

{#snippet left()}{/snippet}

{#snippet right()}
	{@const folderHref =
		page.data.mode === 'directory'
			? page.data.directory.current !== '.'
				? `/editor/directory/${page.data.directory.parent}`
				: '/editor/directory'
			: page.data.directory
				? `/editor/directory/${page.data.directory}`
				: '/editor/directory'}
	<a href={folderHref} aria-label="directory">
		<FolderIcon style="font-size: 1em;" />
	</a>
	{#if page.data.mode === 'directory'}
		<a href="/editor/pieces/create/{page.data.directory.current}" aria-label="create">
			<PlusIcon style="font-size: 1em;" />
		</a>
	{:else if page.data.mode === 'view'}
		<a href="/editor/pieces/edit/{page.data.file}" aria-label="edit">
			<PenIcon style="font-size: 1em;" />
		</a>
	{/if}
{/snippet}

<main>
	<Nav items={{ left, right }} />
	{@render children()}
</main>
