<script lang="ts">
	import { OpengraphImageWidth, OpengraphImageHeight } from '@luzzle/web.pieces'
	import type { Snippet } from 'svelte'

	let { children }: { children: Snippet } = $props()
	const maxWidth = `min(${OpengraphImageWidth}px, calc(80svh * ${OpengraphImageWidth} / ${OpengraphImageHeight}))`
</script>

<div
	class="scale-container"
	style:--card-width="{OpengraphImageWidth}px"
	style:max-width={maxWidth}
>
	<div class="card" style:width="{OpengraphImageWidth}px" style:height="{OpengraphImageHeight}px">
		{@render children()}
	</div>
</div>

<style>
	.scale-container {
		width: 100%;
		margin-inline: auto;
		container-type: inline-size;
		overflow-x: auto;
		box-shadow: var(--shadow-raised);
	}
	.card {
		/* Scale the fixed design even before hydration or without JavaScript. */
		zoom: min(1, tan(atan2(100cqi, var(--card-width))));
	}
</style>
