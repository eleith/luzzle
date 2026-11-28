<script lang="ts">
	import CheckCircleIcon from 'virtual:icons/ph/check-circle'
	import WarningCircleIcon from 'virtual:icons/ph/warning-circle'

	let { ok, message }: { ok: boolean; message: string } = $props()
</script>

<aside class="banner" class:success={ok} class:error={!ok} role="alert">
	<span class="banner-icon">
		{#if ok}
			<CheckCircleIcon aria-hidden="true" />
		{:else}
			<WarningCircleIcon aria-hidden="true" />
		{/if}
	</span>
	<p>{message}</p>
</aside>

<style>
	.banner {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		margin: 0;
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-xs);
	}

	.banner-icon {
		display: inline-flex;
		flex-shrink: 0;
		margin-top: 0.1em;
	}

	p {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.success {
		background: var(--color-primary-container);
		color: var(--color-on-primary-container);
	}

	.error {
		background: var(--color-error-container);
		color: var(--color-on-error-container);
	}
</style>
