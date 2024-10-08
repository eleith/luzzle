<script lang="ts">
	import PieceIcon from '$lib/pieces/components/icon/index.svelte'

	let { data } = $props()
	let activePieceId = $state<string | null>(null)

	const pieces = data.pieces
</script>

<section class="intro">
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
</section>

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
					<div class="icon">
						{#key activePieceId === piece.id}
							<PieceIcon {piece} size="small" active={activePieceId === piece.id} />
						{/key}
					</div>
				</div>
				<div style="flex: 1; align-self: center; padding-top: 45px;">
					{piece.title}
				</div>
			</a>
		</section>
	{/each}
</section>

<style>
	section.intro {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 66.666%;
	}

	section.piece {
		overflow: hidden;
		height: 200px;
	}

	section.piece:nth-child(even) > a {
		flex-direction: row-reverse;
		text-align: right;
	}

	section.piece div.icon {
		position: relative;
		bottom: -80px;
		display: flex;
		justify-content: right;
	}

	section.piece:nth-child(even) div.icon {
		justify-content: left;
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
		width: 66.666%;
		display: flex;
		gap: var(--space-10);
		align-items: baseline;
		color: var(--colors-on-surface);
	}

	section.piece > a:hover {
		color: var(--colors-primary);
	}

	@media screen and (max-width: 768px) {
		section.intro,
		section.piece > a {
			width: 50%;
			min-width: 550px;
			padding-left: 20px;
			padding-right: 20px;
		}
	}
</style>
