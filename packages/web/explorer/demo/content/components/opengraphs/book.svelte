<script lang="ts">
	let { piece, helpers }: PieceOpengraphProps = $props()
	const metadata = piece.metadata
	const palette = helpers.getPiecePalette()

	const bookWidth = 350
	const bookHeight = (bookWidth * 3) / 2
	const scale = Math.round((bookWidth / 375) * 100) / 100
	const coverW = Math.round(bookWidth * 0.8)
	const spineW = Math.round(bookWidth * 0.08)
	const topEdgeH = Math.round(bookWidth * 0.025)

	const bylineParts: string[] = []
	if (metadata.pages) bylineParts.push(`${metadata.pages} pages`)
	if (piece.date_consumed) {
		bylineParts.push(
			new Date(piece.date_consumed)
				.toLocaleDateString('en-US', { timeZone: 'UTC' })
				.replaceAll('/', '.')
		)
	}
</script>

<section
	class="container"
	style="
		--color-main-text: {palette?.bodyText};
		--color-title-text: {palette?.titleText};
		--color-background: {palette?.background};
		--color-accent: {palette?.accent};
		--color-muted: {palette?.muted};"
>
	<div class="main">
		<div class="left-panel">
			<div
				class="book"
				inert
				style="
					--book-width: {bookWidth}px;
					--book-height: {bookHeight}px;
					--cover-w: {coverW}px;
					--spine-w: {spineW}px;
					--top-edge-h: {topEdgeH}px;
					--book-scale: {scale};"
			>
				<div class="book-shadow"></div>
				<div class="book-stage">
					<div class="book-top-edge"></div>
					<div class="book-spine"></div>
					<div class="book-cover">
						{#if metadata.cover}
							<img src={helpers.getPieceImageUrl(metadata.cover, bookWidth, 'jpg')} alt="" />
						{:else}
							<div class="book-cover-front">{piece.title}</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<div class="right-panel">
			<h1
				style="--title-size: {piece.title.length < 10
					? 5
					: piece.title.length < 20
						? 4
						: piece.title.length < 40
							? 3.2
							: 2.5}rem"
			>
				{piece.title}
			</h1>
			{#if metadata.author}
				<h2>by {metadata.author}</h2>
			{/if}
		</div>
	</div>

	{#if bylineParts.length}
		<div class="accent-bar">
			<p class="byline">{bylineParts.join(' · ')}</p>
		</div>
	{/if}
</section>

<style>
	section.container {
		position: relative;
		display: flex;
		width: 100%;
		height: 100%;
		background: var(--color-background);
	}

	.main {
		display: flex;
		width: 100%;
		height: 100%;
	}

	.left-panel {
		flex: 4;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
	}

	.right-panel {
		flex: 5;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		padding: 40px 30px 20px 0;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		color: var(--color-main-text);
	}

	.right-panel h1 {
		font-size: var(--title-size);
		font-weight: 700;
		margin: 0;
		color: var(--color-title-text);
	}

	.right-panel h2 {
		font-size: 1.8rem;
		font-weight: 400;
		margin: 10px 0 0;
	}

	.accent-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		background: oklch(from var(--color-background) 0.22 c h);
		padding: 15px 30px;
		text-align: right;
		z-index: 1;
		border-bottom: 10px solid var(--color-accent);
	}

	.byline {
		font-size: 1.3rem;
		margin: 0;
		color: var(--color-main-text);
	}

	.book {
		position: relative;
		width: calc(var(--cover-w) + var(--spine-w));
		height: var(--book-height);
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.book-shadow {
		position: absolute;
		bottom: -18px;
		left: 50%;
		transform: translateX(-50%);
		width: 88%;
		height: 32px;
		background: radial-gradient(
			ellipse at center,
			oklch(from var(--color-background) 0.05 c h / 0.65) 0%,
			oklch(from var(--color-background) 0.05 c h / 0.45) 35%,
			oklch(from var(--color-background) 0.05 c h / 0) 75%
		);
		border-radius: 50%;
		z-index: 1;
	}

	.book-stage {
		position: relative;
		width: 100%;
		height: 100%;
		transform: rotate(-9deg);
		transform-origin: center;
		z-index: 2;
	}

	.book-top-edge {
		position: absolute;
		top: calc(-1 * var(--top-edge-h));
		left: 0;
		width: calc(var(--cover-w) + var(--spine-w));
		height: var(--top-edge-h);
		transform: skewX(-30deg);
		transform-origin: bottom left;
		background: repeating-linear-gradient(
			to right,
			#ffffff 0,
			#ffffff 2px,
			#cfcfcf 2px,
			#cfcfcf 3px
		);
		border-top: 1px solid #888;
		z-index: 4;
	}

	.book-spine {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--spine-w);
		height: 100%;
		background: black;
		z-index: 3;
	}

	.book-cover {
		position: absolute;
		top: 0;
		left: var(--spine-w);
		width: var(--cover-w);
		height: 100%;
		background: black;
		color: white;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		border-top-right-radius: 7px;
		border-bottom-right-radius: 7px;
		box-shadow: inset 14px 0 24px -8px rgba(255, 255, 255, 0.06);
		z-index: 5;
	}

	.book-cover img {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.book-cover-front {
		padding: 12px;
		text-align: center;
		font-size: calc(2.2rem * var(--book-scale));
		font-weight: 700;
		line-height: 1.1;
		overflow: hidden;
	}
</style>
