<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte'

	let isRunning = $state(false)
	let status = $state<'idle' | 'enqueued' | 'error'>('idle')
	let errorMessage = $state('')
	let jobId = $state('')

	async function startPublish() {
		isRunning = true
		status = 'idle'
		errorMessage = ''
		jobId = ''

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

			const data = await response.json()
			jobId = data.jobId
			status = 'enqueued'
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
				{isRunning ? 'Enqueuing...' : 'Publish Changes'}
			</Button>
		</div>
	</header>

	{#if status === 'error'}
		<div class="error-box">
			<strong>Error:</strong>
			{errorMessage}
		</div>
	{/if}

	{#if status === 'enqueued'}
		<div class="success-box">
			Publish enqueued (jobId: {jobId}) — tail worker logs for progress
		</div>
	{/if}
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
</style>
