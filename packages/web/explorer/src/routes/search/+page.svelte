<script lang="ts">
	import PieceIcon from '$lib/pieces/components/icon/index.svelte'
	import CaretRightIcon from 'virtual:icons/ph/caret-right-thin'

	let activePieceId = $state<string | null>(null)
	let { data } = $props()

	function actionPiece(node: HTMLAnchorElement, focus: boolean) {
		if (focus) {
			node.focus()
		}
	}
</script>

<section class="container">
	{#each data.pieces as piece, i}
		<a
			use:actionPiece={i === 0}
			href="/pieces/{piece.type}/{piece.slug}"
			onmouseenter={() => {
				activePieceId = piece.id
				//pieceIcons[activePieceId].active(true)
			}}
			onmouseleave={() => {
				if (activePieceId) {
					//pieceIcons[activePieceId].active(false)
					activePieceId = null
				}
			}}
			onfocus={() => {
				activePieceId = piece.id
				//pieceIcons[activePieceId].active(true)
			}}
			onblur={() => {
				if (activePieceId) {
					//pieceIcons[activePieceId].active(false)
					activePieceId = null
				}
			}}
			ontouchstart={() => {
				activePieceId = piece.id
				//pieceIcons[activePieceId].active(true)
			}}
			ontouchend={() => {
				if (activePieceId) {
					//pieceIcons[activePieceId].active(false)
					activePieceId = null
				}
			}}
		>
			<div style="display: flex; align-items: flex-start;">
				<div style="flex: 1 1 0%;">
					<div style="display: flex;">
						<div style="align-self: baseline;">
							{#key activePieceId === piece.id}
								<PieceIcon {piece} size="small" active={activePieceId === piece.id} />
							{/key}
						</div>
						<div style="align-self: center;">
							<CaretRightIcon style="margin: auto; font-size: 2em; max-width:unset;" />
						</div>
					</div>
				</div>
				<div style="flex: 1 1 0%; align-self: center; max-height: 160px; overflow: hidden;">
					{piece.title}
				</div>
			</div></a
		>
	{/each}
</section>

<style>
	.container {
		display: grid;
		width: 100%;
		margin: auto;
		margin-top: var(--space-10);
		margin-bottom: var(--space-10);
		grid-template-columns: 280px;
		gap: var(--space-5);
		align-items: start;
		justify-content: center;
	}

	.container:last-child {
		margin-right: auto;
	}

	.container > a {
		color: var(--colors-on-surface);
		cursor: pointer;
		text-decoration: none;
		min-height: 200px;
	}

	.container > a:hover {
		text-decoration: underline;
		color: var(--colors-primary);
	}
</style>
