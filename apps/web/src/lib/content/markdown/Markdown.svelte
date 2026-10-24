<script lang="ts">
	let { html }: { html: string } = $props()
</script>

<div class="markdown">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</div>
