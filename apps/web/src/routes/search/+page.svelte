<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import PieceGrid from '#lib/pieces/components/PieceGrid.svelte'
	import SearchForm from '#lib/components/layout/simple/SearchForm.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
	let query = $derived(data.query)
	let type = $derived(data.type)
	let after = $derived(data.after)
	let before = $derived(data.before)
	let hasSearchTerms = $derived(!!(data.query || data.type || data.after || data.before))

	afterNavigate(({ type, shallow }) => {
		if (shallow && type === 'goto') return

		if (type === 'link') {
			window.scrollTo({ top: 0, behavior: 'smooth' })
		}
	})
</script>

{#if !hasSearchTerms}
	<section class="search-panel" aria-labelledby="search-title">
		<h1 id="search-title">Search</h1>
		<div class="search-form-frame">
			<SearchForm bind:query bind:type bind:after bind:before />
		</div>
	</section>
{:else}
	<section aria-labelledby="search-results-title">
		<PieceGrid {data}>
			{#snippet header()}
				<div class="search-header">
					<h1 id="search-results-title">
						{data.pieces.length === 0 ? 'No results found' : 'Search results'}
					</h1>
					<div class="search-summary">
						{#if data.query}
							for <span class="summary-highlight">"{data.query}"</span>
						{/if}
						{#if data.type}
							in <span class="summary-highlight">{data.type}</span>
						{/if}
						{#if data.after && data.before}
							between <span class="summary-highlight">{data.after}</span> and
							<span class="summary-highlight">{data.before}</span>
						{:else}
							{#if data.after}
								after <span class="summary-highlight">{data.after}</span>
							{/if}
							{#if data.before}
								before <span class="summary-highlight">{data.before}</span>
							{/if}
						{/if}
					</div>
				</div>
			{/snippet}
		</PieceGrid>
	</section>

	{#if data.nextPage}
		<section class="action">
			<!-- eslint-disable svelte/no-navigation-without-resolve -- Query links retain the browser-resolved pathname. -->
			<a
				href="?{new URLSearchParams({
					...(data.query && { query: data.query }),
					...(data.type && { type: data.type }),
					...(data.after && { after: data.after }),
					...(data.before && { before: data.before }),
					page: data.nextPage.toString()
				}).toString()}"
			>
				more
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</section>
	{/if}
{/if}

<style>
	.search-panel {
		max-width: 800px;
		margin: 0 auto var(--space-5);
		padding: var(--space-5);
	}

	.search-panel h1 {
		margin-bottom: var(--space-3);
		font-size: var(--font-size-xl);
	}

	.search-form-frame {
		background: var(--color-surface-container-high);
		border: 2px solid var(--color-outline);
		border-radius: var(--radius-medium);
	}

	.search-header {
		padding-top: var(--space-1);
		text-align: left;
	}

	.search-header h1 {
		margin: 0;
		font-size: var(--font-size-large);
	}

	.search-summary {
		font-size: var(--font-size-small);
		color: var(--color-on-surface-variant);
		margin: 0;
	}

	.summary-highlight {
		color: var(--color-primary);
		font-weight: var(--font-weight-medium);
	}

	.action {
		text-align: center;
		padding: var(--space-5) 0 var(--space-5) 0;
	}
</style>
