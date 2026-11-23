<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import { page } from '$app/state'
	import type { Snippet } from 'svelte'

	let {
		data,
		heading,
		children
	}: {
		data: {
			page: number
			year?: number | null
			nextPage: number | null
		}
		heading?: string
		children: Snippet
	} = $props()

	afterNavigate(({ type, shallow }) => {
		if (shallow && type === 'goto') return

		if (type === 'link') {
			window.scrollTo({ top: 0, behavior: 'smooth' })
		}
	})
</script>

<h1 class="visually-hidden">{heading ?? page.params.piece ?? 'Pieces'}</h1>

<section>
	{@render children()}
</section>

{#if data.nextPage || data.page > 1}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- Query links retain the browser-resolved pathname. -->
	<section class="action">
		{#if data.page > 1}
			{#if data.year}
				<a href="?page={data.page - 1}&year={data.year}">prev</a>
			{:else}
				<a href="?page={data.page - 1}">prev</a>
			{/if}
		{/if}
		{#if data.nextPage}
			{#if data.year}
				<a href="?page={data.nextPage}&year={data.year}">next</a>
			{:else}
				<a href="?page={data.nextPage}">next</a>
			{/if}
		{/if}
	</section>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{/if}

<style>
	.action {
		text-align: center;
		padding: var(--space-5) 0 var(--space-5) 0;
	}
</style>
