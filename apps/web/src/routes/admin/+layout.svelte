<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import AtIcon from 'virtual:icons/ph/at'
	import SignOutIcon from 'virtual:icons/ph/sign-out'
	import { page } from '$app/state'
	import { signOut } from '@auth/sveltekit/client'
	import { onMount } from 'svelte'

	const { children } = $props()

	onMount(() => {
		localStorage.setItem('luzzle.admin', 'true')
	})
</script>

{#snippet left()}
	{#if page.url.pathname !== '/admin'}
		<a href="/admin" aria-label="admin">
			<AtIcon style="font-size: 1em;" />
		</a>
	{/if}
{/snippet}

{#snippet right()}
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
