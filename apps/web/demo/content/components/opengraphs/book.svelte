<script lang="ts">
	let { piece, helpers }: PieceOpengraphProps = $props()
	const metadata = piece.metadata
	const palette = helpers.getPiecePalette()

	const bookWidth = 380
	const bookHeight = (bookWidth * 3) / 2

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
					--book-height: {bookHeight}px;"
			>
				<div class="book-pages">
					<div class="book-page"></div>
					<div class="book-page"></div>
					<div class="book-page"></div>
					<div class="book-page"></div>
				</div>
				<div class="book-cover">
					{#if metadata.cover}
						<img src={helpers.getPieceImageUrl(metadata.cover, bookWidth, 'jpg')} alt="" />
					{:else}
						<div class="book-cover-front">{piece.title}</div>
					{/if}
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
		width: var(--book-width);
		height: var(--book-height);
	}

	.book-cover {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: black;
		color: white;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		z-index: 5;
		box-shadow: 0 0 40px 10px rgba(0, 0, 0, 0.5);
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
		padding: 20px;
		text-align: center;
		font-size: 2.2rem;
		font-weight: 700;
		line-height: 1.1;
		overflow: hidden;
	}

	.book-pages {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
	}

	.book-page {
		position: absolute;
		width: 100%;
		height: 100%;
		background: #f5f5f0;
		border-radius: 2px;
		border: 1px solid #ddd;
	}

	.book-page:nth-child(1) {
		top: 12px;
		left: 12px;
	}

	.book-page:nth-child(2) {
		top: 9px;
		left: 9px;
	}

	.book-page:nth-child(3) {
		top: 6px;
		left: 6px;
	}

	.book-page:nth-child(4) {
		top: 3px;
		left: 3px;
	}
</style>
