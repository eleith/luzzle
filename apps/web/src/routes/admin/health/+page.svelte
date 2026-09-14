<script lang="ts">
	import { enhance } from '$app/forms'
	import type { ActionResult } from '@sveltejs/kit'
	import CheckCircleIcon from 'virtual:icons/ph/check-circle'
	import WarningCircleIcon from 'virtual:icons/ph/warning-circle'
	import SpinnerIcon from 'virtual:icons/ph/spinner'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	type TestResult = { ok: boolean; reason?: string } | null

	let storageTest = $state<TestResult>(data.storage)
	let storageTesting = $state(false)

	let workerTest = $state<TestResult>(null)
	let workerTesting = $state(true)
	data.worker.then((result) => {
		workerTest = result
		workerTesting = false
	})

	let oidcTest = $state<TestResult>(null)
	let oidcTesting = $state(true)
	data.oidcIssuer.then((result) => {
		oidcTest = result
		oidcTesting = false
	})

	function runTest(setTesting: (v: boolean) => void, setResult: (v: TestResult) => void) {
		return () => {
			setTesting(true)
			return async ({ result }: { result: ActionResult }) => {
				setTesting(false)
				setResult(result.type === 'success' ? ((result.data?.result as TestResult) ?? null) : null)
			}
		}
	}
</script>

<svelte:head>
	<title>{data.meta.title}</title>
</svelte:head>

{#snippet banner(result: TestResult)}
	{#if result}
		<aside class="banner {result.ok ? 'banner-success' : 'banner-error'}" role="alert">
			<span class="banner-icon">
				{#if result.ok}
					<CheckCircleIcon aria-hidden="true" />
				{:else}
					<WarningCircleIcon aria-hidden="true" />
				{/if}
			</span>
			<p class="banner-text">
				{result.ok ? 'up' : `down: ${result.reason ?? 'unknown error'}`}
			</p>
		</aside>
	{/if}
{/snippet}

{#snippet testButton(testing: boolean, label = 'test')}
	<button type="submit" class="test-button" class:busy={testing} disabled={testing}>
		<span class="test-label">{label}</span>
		{#if testing}
			<span class="test-spinner"><SpinnerIcon aria-hidden="true" /></span>
		{/if}
	</button>
{/snippet}

<section class="health">
	<section class="health-section">
		<h2 class="section-header">access</h2>
		<div class="cards-list">
			<div class="info-card">
				{@render banner(oidcTest)}
				<div class="info-card-body">
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
				{#if data.configSummary.auth.issuer}
					<div class="info-card-actions">
						<form
							method="POST"
							action="?/testOidcIssuer"
							use:enhance={runTest(
								(v) => (oidcTesting = v),
								(v) => (oidcTest = v)
							)}
						>
							{@render testButton(oidcTesting, 'test issuer')}
						</form>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<section class="health-section">
		<h2 class="section-header">storage</h2>
		<div class="cards-list">
			<div class="info-card">
				{@render banner(storageTest)}
				<div class="info-card-body">
					<h3 class="info-card-title">local storage</h3>
					<dl class="info-list">
						<div class="info-row">
							<dt>root</dt>
							<dd>{data.configSummary.storageRoot}</dd>
						</div>
					</dl>
				</div>
				<div class="info-card-actions">
					<form
						method="POST"
						action="?/testStorage"
						use:enhance={runTest(
							(v) => (storageTesting = v),
							(v) => (storageTest = v)
						)}
					>
						{@render testButton(storageTesting)}
					</form>
				</div>
			</div>

			<div class="info-card">
				<div class="info-card-body">
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
			</div>

			<div class="info-card">
				<div class="info-card-body">
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
		</div>
	</section>

	<section class="health-section">
		<h2 class="section-header">infrastructure</h2>
		<div class="cards-list">
			<div class="info-card">
				{@render banner(workerTest)}
				<div class="info-card-body">
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
				<div class="info-card-actions">
					<form
						method="POST"
						action="?/testWorker"
						use:enhance={runTest(
							(v) => (workerTesting = v),
							(v) => (workerTest = v)
						)}
					>
						{@render testButton(workerTesting)}
					</form>
				</div>
			</div>
		</div>
	</section>

	<section class="health-section">
		<h2 class="section-header">ai</h2>
		<div class="cards-list">
			<div class="info-card">
				<div class="info-card-body">
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
		</div>
	</section>

	<section class="health-section">
		<h2 class="section-header">piece types</h2>
		<div class="cards-list">
			{#each data.configSummary.pieceTypes as pieceType (pieceType.type)}
				<div class="info-card">
					<div class="info-card-body">
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
		background: var(--color-surface-container-highest);
		border-radius: var(--radius-small);
		overflow: hidden;
	}

	.info-card-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
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

	.info-card-actions {
		display: flex;
		justify-content: flex-end;
		padding: var(--space-2) var(--space-4);
		border-top: 1px solid var(--color-outline-variant);
		background: var(--color-surface-container-high);
	}

	.info-card-actions form {
		margin: 0;
	}

	.test-button {
		display: inline-grid;
		grid-template-areas: 'content';
		place-items: center;
		font-size: var(--font-size-xxs);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.3em 0.7em;
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-small);
		background: transparent;
		color: var(--color-on-surface-variant);
		cursor: pointer;
	}

	.test-button > * {
		grid-area: content;
	}

	.test-button:hover:not(:disabled) {
		background: var(--color-surface-container-low);
		color: var(--color-on-surface);
	}

	.test-button:disabled {
		cursor: not-allowed;
	}

	.busy .test-label {
		opacity: 0;
	}

	.test-spinner {
		display: inline-flex;
		animation: test-spin 0.9s linear infinite;
	}

	@keyframes test-spin {
		to {
			transform: rotate(360deg);
		}
	}

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

	.banner-text {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.banner-success {
		background: var(--color-primary-container);
		color: var(--color-on-primary-container);
	}

	.banner-error {
		background: var(--color-error-container);
		color: var(--color-on-error-container);
	}

	@media screen and (min-width: 768px) {
		section.health {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
