<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte'
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import FolderIcon from 'virtual:icons/ph/folder'
	import SignOutIcon from 'virtual:icons/ph/sign-out'
	import { signOut } from '@auth/sveltekit/client'

	let logs = $state('')
	let isBuilding = $state(false)
	let status = $state<'idle' | 'building' | 'success' | 'error'>('idle')
	let errorMessage = $state('')
	let logContainer: HTMLPreElement | null = $state(null)

	async function startBuild() {
		logs = ''
		isBuilding = true
		status = 'building'
		errorMessage = ''

		try {
			const response = await fetch('/api/build', {
				method: 'POST'
			})

			if (!response.ok) {
				const text = await response.text()
				status = 'error'
				errorMessage = text
				isBuilding = false
				return
			}

			const reader = response.body?.getReader()
			if (!reader) {
				status = 'error'
				errorMessage = 'Failed to initialize log stream'
				isBuilding = false
				return
			}

			const decoder = new TextDecoder()

			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				const chunk = decoder.decode(value, { stream: true })
				logs += chunk

				// Auto-scroll to bottom
				if (logContainer) {
					logContainer.scrollTop = logContainer.scrollHeight
				}
			}

			status = 'success'
		} catch (e) {
			status = 'error'
			errorMessage = e instanceof Error ? e.message : String(e)
		} finally {
			isBuilding = false
		}
	}
</script>

{#snippet right()}
	<a href="/editor/directory" aria-label="directory">
		<FolderIcon style="font-size: 1em;" />
	</a>
	<button onclick={() => signOut({ callbackUrl: '/' })} aria-label="sign out">
		<SignOutIcon style="font-size: 1em;" />
	</button>
{/snippet}

<Nav items={{ right }} />

<section class="builder-container">
	<header>
		<h1>System Rebuild</h1>
		<div class="actions">
			<Button onclick={startBuild} disabled={isBuilding}>
				{isBuilding ? 'Building...' : 'Start Rebuild'}
			</Button>
		</div>
	</header>

	{#if status === 'error'}
		<div class="error-box">
			<strong>Error:</strong>
			{errorMessage}
		</div>
	{/if}

	{#if status === 'success'}
		<div class="success-box">Rebuild finished successfully!</div>
	{/if}

	<div class="console">
		<pre bind:this={logContainer}>{logs || 'Log output will appear here...'}</pre>
	</div>
</section>

<style>
	.builder-container {
		margin: var(--space-4) auto;
		padding: 0 var(--space-4);
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-width: clamp(500px, 80%, 1200px);
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-4);
	}

	h1 {
		font-size: var(--font-size-xl);
		margin: 0;
	}

	.error-box {
		padding: var(--space-3);
		background-color: var(--color-error-container);
		color: var(--color-on-error-container);
		border-radius: var(--radius-small);
		border: 1px solid var(--color-error);
	}

	.success-box {
		padding: var(--space-3);
		background-color: var(--color-primary-container);
		color: var(--color-on-primary-container);
		border-radius: var(--radius-small);
		border: 1px solid var(--color-primary);
	}

	.console {
		background-color: #1e1e1e;
		color: #d4d4d4;
		border-radius: var(--radius-medium);
		padding: var(--space-4);
		font-family: var(--font-mono-name);
		font-size: 14px;
		height: 60vh;
		min-height: 300px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
	}

	pre {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-all;
		overflow-y: auto;
		height: 100%;
		scrollbar-width: thin;
		scrollbar-color: var(--color-outline) transparent;
	}
</style>
