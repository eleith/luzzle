<script lang="ts">
	let { markup, active }: { markup: string; active: boolean } = $props()
</script>

<div data-active={active ? 'true' : undefined}>
	<!-- Keep SSR fragment comments below one root: a top-level empty comment would
	     be mistaken for the end of the host's raw HTML during hydration. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- Server-rendered markup from the operator's template. -->
	{@html `<div>${markup}</div>`}
</div>
