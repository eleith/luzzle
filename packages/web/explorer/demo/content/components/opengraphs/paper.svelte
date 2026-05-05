<script lang="ts">
	import { type PieceOpengraphProps } from '$lib/pieces/helpers'
	import Icon from '$lib/pieces/components/icon.svelte'

	const { helpers, piece }: PieceOpengraphProps = $props()
	const minutes = Math.floor(((piece.note?.length || 0) as number) / 5 / 250)

	const bylineParts: string[] = [];
	if (minutes > 0) bylineParts.push(`${minutes} min read`);
	if (piece.date_consumed) {
		bylineParts.push(
			new Date(piece.date_consumed).toLocaleDateString("en-US", { timeZone: "UTC" }).replaceAll("/", "."),
		);
	}
</script>

<section class="container">
	<div class="paper-backdrop">
		<Icon {piece} size={{ width: 900 }} lazy={false} {helpers} />
	</div>

	{#if bylineParts.length}
		<div class="accent-bar">
			<p class="byline">{bylineParts.join(" · ")}</p>
		</div>
	{/if}
</section>

<style>
	section.container {
		position: relative;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		width: 100%;
		height: 100%;
		background: var(--color-surface-inverse);
		border-bottom: 10px solid var(--color-primary);
		overflow: hidden;
	}

	.paper-backdrop {
		position: absolute;
		top: 30px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1;
		--paper-hole-color: var(--color-surface-inverse);
	}

	.accent-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: oklch(from var(--color-surface-container) l c h / 0.96);
		padding: 10px 30px;
		text-align: right;
		z-index: 2;
	}

	.accent-bar h1 {
		font-size: var(--title-size);
		font-weight: 700;
		margin: 0;
		color: var(--color-on-surface);
		overflow: hidden;
		text-overflow: ellipsis;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		display: -webkit-box;
		-webkit-box-orient: vertical;
	}

	.byline {
		font-size: 1.3rem;
		margin: 8px 0 0;
		color: var(--color-on-surface-variant);
	}
</style>
