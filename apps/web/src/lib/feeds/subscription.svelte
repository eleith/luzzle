<script lang="ts">
	let { url }: { url: string } = $props()
	let input: HTMLInputElement | undefined = $state()
	let copyStatus = $state<'idle' | 'copied' | 'manual'>('idle')

	async function copySubscription() {
		input?.focus()
		input?.select()
		try {
			await navigator.clipboard.writeText(url)
			copyStatus = 'copied'
		} catch {
			copyStatus = 'manual'
		}
	}
</script>

<aside class="subscription" aria-label="RSS subscription">
	<p>
		View the raw data files: <a href="feed.xml">XML</a> | <a href="feed.json">JSON</a> |
		<a href="feed.md">Markdown</a>
	</p>
	<p id="rss-instructions">Copy the link and paste it into an RSS reader.</p>
	<div class="copy-controls">
		<input
			bind:this={input}
			type="text"
			readonly
			value={url}
			aria-label="RSS feed URL"
			aria-describedby="rss-instructions"
			onclick={() => input?.select()}
			class="input"
		/>
		<button type="button" onclick={copySubscription} class="button"
			>{copyStatus === 'copied' ? 'copied' : 'copy'}</button
		>
	</div>
	<p class="status" role="status" aria-live="polite">
		{#if copyStatus === 'copied'}
			Link copied.
		{:else if copyStatus === 'manual'}
			Select the link and copy it into an RSS reader.
		{/if}
	</p>
</aside>

<style>
	.subscription {
		background: var(--color-surface);
		border: 1px solid var(--color-surface-container-high);
		padding: var(--space-5);
		border-radius: var(--radius-medium);
	}
	.copy-controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}
	input {
		flex: 1;
		min-width: 0;
	}
	.status {
		margin-bottom: 0;
	}
	.status:empty {
		display: none;
	}
</style>
