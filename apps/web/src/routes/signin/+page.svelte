<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte'
	import { signIn } from '@auth/sveltekit/client'
	import { page } from '$app/state'
	import { goto } from '$app/navigation'

	let { data } = $props()
	const redirectTo = $derived(page.url.searchParams.get('redirectTo') || '/admin')

	let username = $state('')
	let password = $state('')
	let error = $state('')

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault()
		error = ''

		const result = await signIn('credentials', {
			username,
			password,
			redirect: false,
			callbackUrl: redirectTo
		})

		if (result?.error) {
			error = 'Invalid username or password'
		} else {
			localStorage.setItem('luzzle.admin', 'true')
			goto(redirectTo)
		}
	}
</script>

<section>
	{#if data.authType === 'oidc'}
		<Button onclick={() => signIn('oidc', { callbackUrl: redirectTo })}>login (oidc)</Button>
	{:else if data.authType === 'credentials'}
		<form onsubmit={handleSubmit} class="login-form">
			{#if error}
				<div class="error">{error}</div>
			{/if}
			<div class="field">
				<label for="username">username</label>
				<input type="text" id="username" bind:value={username} class="input" required />
			</div>
			<div class="field">
				<label for="password">password</label>
				<input type="password" id="password" bind:value={password} class="input" required />
			</div>
			<Button type="submit">login</Button>
		</form>
	{/if}
</section>

<style>
	section {
		display: flex;
		height: calc(100vh - 300px);
		justify-content: center;
		align-items: center;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		width: 100%;
		max-width: 300px;
		padding: var(--space-6);
		background: var(--color-surface-container-low);
		border-radius: var(--radius-medium);
		border: 1px solid var(--color-outline);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.field label {
		font-size: var(--font-size-xxs);
		text-transform: uppercase;
	}

	.error {
		color: var(--color-error);
		font-size: var(--font-size-xs);
		margin-bottom: var(--space-2);
	}
</style>
