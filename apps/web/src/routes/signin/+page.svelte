<script lang="ts">
	import { onMount } from 'svelte'
	import WarningIcon from 'virtual:icons/ph/warning-circle'
	import Button from '#lib/components/ui/Button.svelte'
	import { signInCredentials, signInOidc, type AuthFailure } from '#lib/auth-client.js'
	import { goto } from '$app/navigation'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
	const redirectTo = $derived(data.redirectTo)
	const site = $derived(data.config.content)

	let form: HTMLFormElement | undefined = $state()
	let username = $state('')
	let password = $state('')
	let pending = $state(false)
	let submitError = $state<AuthFailure | 'NavigationError' | null>(null)
	const errorCode = $derived(submitError ?? data.errorCode)

	onMount(() => {
		if (!window.matchMedia('(min-width: 48rem) and (pointer: fine)').matches) return
		form?.querySelector<HTMLElement>('input[name="username"], button[type="submit"]')?.focus()
	})

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault()
		if (pending) return
		if (data.authType === 'oidc') {
			await handleOidc()
			return
		}

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
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- Validated browser destination already includes any application base.
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

<svelte:head>
	<title>Sign in — {site.text.title}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<svelte:window
	onpageshow={(event) => {
		if (event.persisted) pending = false
	}}
/>

<section class="signin-card" aria-labelledby="signin-title">
	<header class="signin-header">
		<img src={site.images.favicon} alt="" width="48" height="48" />
		<h1 id="signin-title">Sign in to {site.text.title}</h1>
		<p>Manage and publish your archive.</p>
	</header>

	{#if errorCode}
		<div class="error-banner" role="alert">
			<WarningIcon aria-hidden="true" focusable="false" />
			<div>
				{#if errorCode === 'NavigationError'}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- Use the same validated destination as the server redirect. -->
					Signed in. <a href={redirectTo}>Continue</a> when ready.
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{:else if errorCode === 'CredentialsSignin'}
					Invalid username or password. Please try again.
				{:else if errorCode === 'RateLimited'}
					Too many sign-in attempts. Please wait and try again.
				{:else if errorCode === 'NetworkError'}
					Unable to connect. Please try again.
				{:else}
					Unable to sign in. Please try again.
				{/if}
			</div>
		</div>
	{/if}

	<form
		method="POST"
		onsubmit={handleSubmit}
		bind:this={form}
		class="signin-form"
		aria-busy={pending}
	>
		{#if data.authType === 'credentials'}
			<div class="field">
				<label for="username">Username</label>
				<input
					type="text"
					id="username"
					name="username"
					bind:value={username}
					autocomplete="username"
					disabled={pending}
					required
				/>
			</div>
			<div class="field">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					name="password"
					bind:value={password}
					autocomplete="current-password"
					disabled={pending}
					required
				/>
			</div>
		{:else if data.authType === 'oidc'}
			<p class="sso-description">Use {data.oidcName} to access your archive.</p>
		{/if}

		<Button type="submit" disabled={pending}>
			{#if pending}
				Signing in…
			{:else if data.authType === 'oidc'}
				Sign in with {data.oidcName}
			{:else}
				Sign in
			{/if}
		</Button>
	</form>

	<noscript><p class="javascript-notice">JavaScript is required to sign in.</p></noscript>
</section>

<style>
	.signin-card {
		width: 100%;
		max-width: 400px;
		min-width: 0;
		display: grid;
		gap: 20px;
		padding: 32px;
		font-size: 14px;
		line-height: 1.5;
		background: var(--color-surface-container-low);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-large);
		box-shadow: var(--shadow-raised);
	}

	.signin-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		text-align: center;
	}

	.signin-header img {
		object-fit: contain;
	}

	h1 {
		margin: 0;
		font-size: 24px;
		font-weight: var(--font-weight-bold);
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	.signin-header p,
	.sso-description,
	.javascript-notice {
		margin: 0;
		color: var(--color-on-surface-variant);
		font-size: 14px;
		line-height: 1.5;
		text-align: center;
	}

	.signin-form {
		display: grid;
		gap: 16px;
	}

	.field {
		display: grid;
		gap: 4px;
		min-width: 0;
	}

	label {
		font-size: 14px;
		font-weight: var(--font-weight-medium);
	}

	input {
		width: 100%;
		min-width: 0;
		min-height: 44px;
		padding: 8px 12px;
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-small);
		background: var(--color-surface-container-highest);
		color: var(--color-on-surface);
		font: inherit;
		font-size: 16px;
	}

	input:focus-visible,
	.signin-form :global(.button:focus-visible) {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	input:disabled {
		opacity: 0.6;
	}

	.signin-form :global(.button) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: auto;
		min-height: 44px;
		padding: 10px 12px;
		text-transform: none;
		white-space: normal;
		overflow-wrap: anywhere;
		font-size: 16px;
		line-height: 1.4;
	}

	.error-banner {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 12px;
		border: 1px solid var(--color-error);
		border-radius: var(--radius-small);
		background: var(--color-error-container);
		color: var(--color-on-error-container);
		font-size: 14px;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}

	.error-banner :global(svg) {
		flex-shrink: 0;
		width: 1.25em;
		height: 1.25em;
	}

	.error-banner a {
		color: inherit;
	}

	@media (max-width: 30rem) {
		.signin-card {
			padding: 20px;
			border: none;
			box-shadow: none;
			background: transparent;
		}
	}
</style>
