<script lang="ts">
	import type { ComponentProps } from 'svelte'
	import Layout from '../+layout@.svelte'
	import Overview from '../+page.svelte'
	import Page from '../page/+page.svelte'
	import Icon from '../icon/+page.svelte'
	import Share from '../share/+page.svelte'
	let {
		data,
		view = 'overview'
	}: {
		data: ComponentProps<typeof Overview>['data']
		view?: 'overview' | 'page' | 'icon' | 'share'
	} = $props()
	const params = $derived({ path: data.file })
</script>

<Layout {data} {params}>
	{#if view === 'page'}
		<Page data={{ ...data, presentation: null }} {params} form={null} />
	{:else if view === 'icon'}
		<Icon {data} {params} />
	{:else if view === 'share'}
		<Share {data} {params} />
	{:else}
		<Overview {data} {params} />
	{/if}
</Layout>
