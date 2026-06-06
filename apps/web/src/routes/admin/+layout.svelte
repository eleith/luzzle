<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import FolderIcon from 'virtual:icons/ph/folder'
	import PlusIcon from 'virtual:icons/ph/plus'
	import ArrowCircleUpIcon from 'virtual:icons/ph/arrow-circle-up'
	import SignOutIcon from 'virtual:icons/ph/sign-out'
	import { page } from '$app/state'
	import { signOut } from '@auth/sveltekit/client'
	import { onMount } from 'svelte'

	const { children } = $props()

	onMount(() => {
		localStorage.setItem('luzzle.admin', 'true')
	})
</script>

{#snippet left()}{/snippet}

{#snippet right()}
	{@const folderHref =
		page.data.mode === 'directory'
			? page.data.directory.current !== '.'
				? `/admin/directory/${page.data.directory.parent}`
				: '/admin/directory'
			: page.data.directory
				? `/admin/directory/${page.data.directory}`
				: '/admin/directory'}
	<a href={folderHref} aria-label="directory">
		<FolderIcon style="font-size: 1em;" />
	</a>
	{@const createHref =
		page.data.mode === 'directory'
			? `/admin/pieces/create/${page.data.directory.current}`
			: '/admin/pieces/create'}
	<a href={createHref} aria-label="create">
		<PlusIcon style="font-size: 1em;" />
	</a>
	<a href="/admin/publish" aria-label="publish">
		<ArrowCircleUpIcon style="font-size: 1em;" />
	</a>
	<button
		onclick={() => {
			localStorage.removeItem('luzzle.admin')
			signOut({ callbackUrl: '/' })
		}}
		aria-label="sign out"
	>
		<SignOutIcon style="font-size: 1em;" />
	</button>
{/snippet}

<Nav items={{ left, right }} />

<main id="main-content">
	{@render children()}
</main>
