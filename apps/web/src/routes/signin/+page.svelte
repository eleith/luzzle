<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte'
	import { signInCredentials, signInOidc, type AuthFailure } from '#lib/auth-client.js'
	import { goto } from '$app/navigation'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
	const redirectTo = $derived(data.redirectTo)

	let username = $state('')
	let password = $state('')
	let pending = $state(false)
	let submitError = $state<AuthFailure | 'NavigationError' | null>(null)
	const errorCode = $derived(submitError ?? data.errorCode)

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault()
		if (pending) return
		pending = true
		submitError = null
		const failure = await signInCredentials(username, password)
		if (failure) {
			submitError = failure
			pending = false
			return
		}
		localStorage.setItem('luzzle.admin', 'true')
		try {
			await goto(redirectTo, { refreshAll: true })
		} catch {
			submitError = 'NavigationError'
		} finally {
			pending = false
		}
	}

	async function handleOidc() {
		if (pending) return
		pending = true
		submitError = null
		const failure = await signInOidc(redirectTo)
		if (failure) {
			submitError = failure
			pending = false
		}
	}
</script>

<svelte:window
	onpageshow={(event) => {
		if (event.persisted) pending = false
	}}
/>

{#snippet errorBanner()}
	{#if errorCode}
		<div class="error" role="alert">
			{#if errorCode === 'NavigationError'}
				Signed in. <a href={redirectTo}>Continue</a> when ready.
			{:else if errorCode === 'CredentialsSignin'}
				Invalid username or password
			{:else if errorCode === 'RateLimited'}
				Too many sign-in attempts. Please wait and try again.
			{:else if errorCode === 'NetworkError'}
				Unable to connect. Please try again.
			{:else}
				Unable to sign in. Please try again.
			{/if}
		</div>
	{/if}
{/snippet}

<h1 class="visually-hidden">Login</h1>

<section>
	{#if data.authType === 'oidc'}
		<div class="oidc-login">
			{@render errorBanner()}
			<p>login via {data.oidcName}</p>
			<Button onclick={handleOidc} disabled={pending}>login</Button>
		</div>
	{:else if data.authType === 'credentials'}
		<form onsubmit={handleSubmit} class="login-form" aria-busy={pending}>
			{@render errorBanner()}
			<div class="field">
				<label for="username">username</label>
				<input
					type="text"
					id="username"
					bind:value={username}
					class="input"
					autocomplete="username"
					disabled={pending}
					required
				/>
			</div>
			<div class="field">
				<label for="password">password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					class="input"
					autocomplete="current-password"
					disabled={pending}
					required
				/>
			</div>
			<Button type="submit" disabled={pending}>login</Button>
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

	.oidc-login {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
	}

	.oidc-login p {
		margin: 0;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
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
