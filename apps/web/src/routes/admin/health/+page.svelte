<script lang="ts">
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
</script>

<svelte:head>
	<title>{data.meta.title}</title>
</svelte:head>

<section class="health">
	<section class="health-section">
		<h2 class="section-header">access</h2>
		<div class="cards-list">
			<div class="info-card">
				<h3 class="info-card-title">auth</h3>
				<dl class="info-list">
					<div class="info-row">
						<dt>status</dt>
						<dd>{data.configSummary.auth.enabled ? 'enabled' : 'disabled'}</dd>
					</div>
					<div class="info-row">
						<dt>type</dt>
						<dd>{data.configSummary.auth.type}</dd>
					</div>
					{#if data.configSummary.auth.issuer}
						<div class="info-row">
							<dt>issuer</dt>
							<dd>{data.configSummary.auth.issuer}</dd>
						</div>
					{/if}
					{#if data.configSummary.auth.clientId}
						<div class="info-row">
							<dt>client id</dt>
							<dd>{data.configSummary.auth.clientId}</dd>
						</div>
					{/if}
					{#if data.configSummary.auth.username}
						<div class="info-row">
							<dt>username</dt>
							<dd>{data.configSummary.auth.username}</dd>
						</div>
					{/if}
				</dl>
			</div>
		</div>
	</section>

	<section class="health-section">
		<h2 class="section-header">storage</h2>
		<div class="cards-list">
			<div class="info-card">
				<h3 class="info-card-title">archive sync</h3>
				<dl class="info-list">
					<div class="info-row">
						<dt>status</dt>
						<dd>{data.configSummary.archiveSync.configured ? 'configured' : 'not configured'}</dd>
					</div>
					{#if data.configSummary.archiveSync.remote}
						<div class="info-row">
							<dt>remote</dt>
							<dd>{data.configSummary.archiveSync.remote}</dd>
						</div>
					{/if}
					{#if data.configSummary.archiveSync.path}
						<div class="info-row">
							<dt>path</dt>
							<dd>{data.configSummary.archiveSync.path}</dd>
						</div>
					{/if}
				</dl>
			</div>

			<div class="info-card">
				<h3 class="info-card-title">cdn sync</h3>
				<dl class="info-list">
					<div class="info-row">
						<dt>status</dt>
						<dd>{data.configSummary.cdnSync.configured ? 'configured' : 'not configured'}</dd>
					</div>
					{#if data.configSummary.cdnSync.remote}
						<div class="info-row">
							<dt>remote</dt>
							<dd>{data.configSummary.cdnSync.remote}</dd>
						</div>
					{/if}
					{#if data.configSummary.cdnSync.path}
						<div class="info-row">
							<dt>path</dt>
							<dd>{data.configSummary.cdnSync.path}</dd>
						</div>
					{/if}
					{#if data.configSummary.cdnSync.strategy}
						<div class="info-row">
							<dt>strategy</dt>
							<dd>{data.configSummary.cdnSync.strategy}</dd>
						</div>
					{/if}
				</dl>
			</div>
		</div>
	</section>

	<section class="health-section">
		<h2 class="section-header">infrastructure</h2>
		<div class="cards-list">
			<div class="info-card">
				<h3 class="info-card-title">worker</h3>
				{#if data.configSummary.worker.address}
					<p class="info-address">{data.configSummary.worker.address}</p>
				{/if}
				<p class="info-description">
					Runs publish syncs (archive, cdn), asset generation, and connectivity checks.
				</p>
				<dl class="info-list">
					<div class="info-row">
						<dt>queue</dt>
						<dd>{data.configSummary.worker.queuePath ?? 'not configured'}</dd>
					</div>
				</dl>
			</div>
		</div>
	</section>

	<section class="health-section">
		<h2 class="section-header">ai</h2>
		<div class="cards-list">
			<div class="info-card">
				<h3 class="info-card-title">ai generation</h3>
				<dl class="info-list">
					<div class="info-row">
						<dt>status</dt>
						<dd>{data.configSummary.ai.configured ? 'configured' : 'not configured'}</dd>
					</div>
					{#if data.configSummary.ai.provider}
						<div class="info-row">
							<dt>provider</dt>
							<dd>{data.configSummary.ai.provider}</dd>
						</div>
					{/if}
				</dl>
			</div>
		</div>
	</section>

	<section class="health-section">
		<h2 class="section-header">piece types</h2>
		<div class="cards-list">
			{#each data.configSummary.pieceTypes as pieceType (pieceType.type)}
				<div class="info-card">
					<h3 class="info-card-title">{pieceType.type}</h3>
					<dl class="info-list">
						{#each pieceType.fields as field (field.name)}
							<div class="info-row">
								<dt>{field.name}</dt>
								<dd>{field.value}</dd>
							</div>
						{/each}
						{#each pieceType.components as component (component.name)}
							<div class="info-row">
								<dt>{component.name}</dt>
								<dd>{component.value}</dd>
							</div>
						{/each}
					</dl>
				</div>
			{/each}
		</div>
	</section>
</section>

<style>
	section.health {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.health-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}

	.section-header {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-on-surface-variant);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 0;
	}

	.cards-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.info-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
		background: var(--color-surface-container-highest);
		border-radius: var(--radius-small);
	}

	.info-card-title {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 0;
	}

	.info-address {
		font-size: var(--font-size-xs);
		font-family: var(--font-mono-name, monospace);
		color: var(--color-on-surface-variant);
		margin: 0;
	}

	.info-description {
		font-size: var(--font-size-xs);
		color: var(--color-on-surface-variant);
		margin: 0;
	}

	.info-list {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: var(--space-1) var(--space-3);
		margin: 0;
	}

	.info-row {
		display: contents;
	}

	.info-row dt {
		color: var(--color-on-surface-variant);
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		white-space: nowrap;
	}

	.info-row dd {
		margin: 0;
		font-size: var(--font-size-xs);
		overflow-wrap: anywhere;
	}

	@media screen and (min-width: 768px) {
		section.health {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
