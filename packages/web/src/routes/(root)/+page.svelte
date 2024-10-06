<script lang="ts">
	import PieceIcon from '$lib/pieces/components/icon/index.svelte'

	let { data } = $props()
	let activePieceId = $state<string | null>(null)

	const pieces = data.pieces
</script>

<main>
	<h1>hello</h1>
	<p>
		this site allows me to recall and share
		{#each pieces as piece, i}
			{#if i !== pieces.length - 1}
				<a href="/pieces/{piece.type}">{piece.type}</a>,&nbsp;
			{:else}
				<a href="/pieces/{piece.type}">{piece.type}</a>
			{/if}
		{/each}
		other <a href="/pieces">things</a>
	</p>
</main>

<section>
	{#each pieces as piece}
		<section class="piece">
			<a
				href="/pieces/{piece.type}/{piece.slug}"
				onmouseenter={() => {
					activePieceId = piece.id
				}}
				onmouseleave={() => {
					if (activePieceId) {
						activePieceId = null
					}
				}}
				onfocus={() => {
					activePieceId = piece.id
				}}
				onblur={() => {
					if (activePieceId) {
						activePieceId = null
					}
				}}
				ontouchstart={() => {
					activePieceId = piece.id
				}}
				ontouchend={() => {
					if (activePieceId) {
						activePieceId = null
					}
				}}
			>
				<div style="flex: 1;">
					<div style="position: relative; bottom: -80px;">
						{#key activePieceId === piece.id}
							<PieceIcon {piece} size="small" active={activePieceId === piece.id} />
						{/key}
					</div>
				</div>
				<div style="flex: 2; align-self: end;">
					{piece.title}
				</div>
			</a>
		</section>
	{/each}
</section>

<footer></footer>

<style>
	main,
	footer {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
	}

	footer {
		text-align: right;
	}

	section.piece {
		overflow: hidden;
		height: 200px;
	}

	section.piece:nth-child(even) > a {
		flex-direction: row-reverse;
	}

	section.piece > a {
		margin-left: auto;
		margin-right: auto;
		display: flex;
		justify-content: flex-start;
		padding: var(--space-8);
		padding-top: 0px;
		width: 100%;
		box-shadow: inset 0 11px 8px -10px var(--colors-shadow);
	}

	section.piece > a {
		display: flex;
		gap: var(--space-3);
		align-items: baseline;
		color: var(--colors-on-surface);
	}

	section.piece > a:hover {
		color: var(--colors-primary);
	}

	@media screen and (min-width: 768px) {
		main,
		footer,
		section.piece > a {
			width: 66.66666%;
		}
	}

	@media screen and (min-width: 1024px) {
		main,
		footer,
		section.piece > a {
			width: 50%;
		}
	}
</style>
