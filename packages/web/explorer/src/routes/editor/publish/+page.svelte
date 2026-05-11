<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte'
	import { tick } from 'svelte'

	let logs = $state('')
	let isRunning = $state(false)
	let status = $state<'idle' | 'running' | 'success' | 'error'>('idle')
	let errorMessage = $state('')
	let logContainer: HTMLPreElement | null = $state(null)

	async function startPublish() {
		logs = ''
		isRunning = true
		status = 'running'
		errorMessage = ''

		try {
			const response = await fetch(`/api/publish`, {
				method: 'POST'
			})

			if (!response.ok) {
				const text = await response.text()
				status = 'error'
				errorMessage = response.status === 409 ? `Conflict: ${text}` : text
				return
			}

			const reader = response.body?.getReader()
			if (!reader) {
				status = 'error'
				errorMessage = 'Failed to initialize log stream'
				return
			}

			const decoder = new TextDecoder()

			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				const chunk = decoder.decode(value, { stream: true })

				// Check if we are at the bottom before adding new logs
				// We allow a small 10px buffer
				const isAtBottom = logContainer
					? logContainer.scrollHeight - logContainer.scrollTop <= logContainer.clientHeight + 10
					: true

				logs += chunk

				if (isAtBottom && logContainer) {
					await tick()
					logContainer.scrollTop = logContainer.scrollHeight
				}
			}

			status = 'success'
		} catch (e) {
			status = 'error'
			errorMessage = e instanceof Error ? e.message : String(e)
		} finally {
			isRunning = false
		}
	}
</script>

<section class="builder-container">
	<header>
		<h1>Publish Workspace</h1>
		<div class="actions">
			<Button onclick={startPublish} disabled={isRunning}>
				{isRunning ? 'Publishing...' : 'Publish Changes'}
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
		<div class="success-box">Operation finished successfully!</div>
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

	.actions {
		display: flex;
		gap: var(--space-3);
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
