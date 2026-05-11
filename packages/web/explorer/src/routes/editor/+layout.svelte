<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import FolderIcon from 'virtual:icons/ph/folder'
	import PlusIcon from 'virtual:icons/ph/plus'
	import ArrowCircleUpIcon from 'virtual:icons/ph/arrow-circle-up'
	import SignOutIcon from 'virtual:icons/ph/sign-out'
	import { page } from '$app/state'
	import { signOut } from '@auth/sveltekit/client'

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
	{/if}
	<a href="/editor/publish" aria-label="publish">
		<ArrowCircleUpIcon style="font-size: 1em;" />
	</a>
	<button onclick={() => signOut({ callbackUrl: '/' })} aria-label="sign out">
		<SignOutIcon style="font-size: 1em;" />
	</button>
{/snippet}

<main>
	<Nav items={{ left, right }} />
	{@render children()}
</main>
