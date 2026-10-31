<script lang="ts">
	import Nav from '#lib/components/layout/simple/nav.svelte'
	import AtIcon from 'virtual:icons/ph/at'
	import SignOutIcon from 'virtual:icons/ph/sign-out'
	import { page } from '$app/state'
	import { signOut, type AuthFailure } from '#lib/auth-client.js'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'

	const { children } = $props()
	const isSourceEditor = $derived(page.route.id === '/(auth)/admin/piece/[...path]/source')
	let signingOut = $state(false)
	let signOutError = $state<AuthFailure | 'navigation' | null>(null)

	async function handleSignOut() {
		if (signingOut) return
		signingOut = true
		signOutError = null
		const failure = await signOut()
		if (failure) {
			signOutError = failure
			signingOut = false
			return
		}
		localStorage.removeItem('luzzle.admin')
		try {
			await goto('/', { refreshAll: true })
		} catch {
			signOutError = 'navigation'
		} finally {
			signingOut = false
		}
	}

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
	{#if signOutError}
		<span class="sign-out-error" role="alert">
			{#if signOutError === 'navigation'}
				Signed out. Navigation was cancelled or failed.
			{:else}
				Unable to sign out. Please try again.
			{/if}
		</span>
	{/if}
	<button onclick={handleSignOut} disabled={signingOut} aria-label="sign out">
		<SignOutIcon style="font-size: 1em;" />
	</button>
{/snippet}

<div class:editor-layout={isSourceEditor}>
	<Nav showHome={page.url.pathname === '/admin'} items={{ left, right }} />

	<main id="main-content">
		{@render children()}
	</main>
</div>

<style>
	.sign-out-error {
		color: var(--color-error);
		font-size: var(--font-size-xs);
		max-width: 20rem;
	}

	.editor-layout {
		height: 100dvh;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		overflow: hidden;
	}

	.editor-layout > main {
		display: flex;
		flex-direction: column;
		min-height: 0;
		min-width: 0;
		overflow: hidden;
	}
</style>
