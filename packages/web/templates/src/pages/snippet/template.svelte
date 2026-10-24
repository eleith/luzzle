<script lang="ts">
	import { formatPieceDate } from '@luzzle/web.pieces'
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import type { Fields } from './schema.js'
	import { getFileByline } from './helpers.js'

	type Props = {
		piece: PublicWebPiece
		fields: Fields
		tags: Array<{ slug: string; tag: string }>
		helpers: PieceComponentHelpers
	}
	let { piece, fields, tags, helpers }: Props = $props()
	const files = $derived(fields.files ?? [])
	const bylineParts = $derived(
		[...getFileByline(files), formatPieceDate(piece.date_consumed)].filter(Boolean)
	)
	const dateUpdated = $derived(formatPieceDate(fields.dateUpdated))
</script>

<main>
	<section class="content">
		<section class="details">
			<h1>
				{piece.title}
			</h1>

			{#if bylineParts.length}
				<p class="byline">{bylineParts.join(' · ')}</p>
			{/if}

			<section class="note">
				<h2>Note</h2>
				{#if piece.note}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html helpers.getPieceAssetContent(piece.key, 'markdown') || piece.note}
				{:else}
					<em class="empty-note">this record does not have a note</em>
				{/if}
			</section>

			{#if files.length > 0}
				<section class="note">
					<h2>Files</h2>
					<div class="files-container">
						{#each files as file}
							{@const attachment = helpers.getPieceAssetUrl(file.file, 'attachment')}
							{@const name = file.name || file.file}

							{@const highlight =
								(file.type ?? 'snippet') === 'snippet'
									? helpers.getPieceAssetContent(file.file, 'highlight')
									: undefined}
							<div class="file">
								<div class="file-header">
									<div class="file-filename">{name}</div>
									<div class="file-controls">
										<div class="file-format">{file.format}</div>
										{#if attachment}
											<div class="file-download">
												<a href={attachment} aria-label="download {name}"
													><svg
														xmlns="http://www.w3.org/2000/svg"
														width="16"
														height="16"
														fill="currentColor"
														viewBox="0 0 256 256"
														><path
															d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Zm-42.34-61.66a8,8,0,0,1,0,11.32l-24,24a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L120,164.69V120a8,8,0,0,1,16,0v44.69l10.34-10.35A8,8,0,0,1,157.66,154.34Z"
														></path></svg
													></a
												>
											</div>
										{/if}
									</div>
								</div>
								{#if highlight}
									<div class="file-content">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										{@html highlight}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/if}

			{#if dateUpdated}
				<div class="info">
					last updated: {dateUpdated}
				</div>
			{/if}
			{#if tags.length}
				<div class="section">
					<div class="tags-container">
						{#each tags as tag (tag.slug)}
							<a href="/tags/{encodeURIComponent(tag.slug)}" class="tag"
								>#{tag.tag?.toLowerCase()}</a
							>
						{/each}
					</div>
				</div>
			{/if}
		</section>
	</section>
</main>

<style>
	section.content {
		width: 100%;
		position: relative;
	}

	section.details {
		display: flex;
		flex-direction: column;
		margin: auto;
		gap: var(--space-5);
		justify-content: space-between;
		width: 85%;
		padding-right: var(--space-2-5);
		padding-left: var(--space-2-5);
		padding-bottom: var(--space-5);
		padding-top: var(--space-5);
	}

	@media screen and (min-width: 768px) {
		section.details {
			width: clamp(500px, 80%, 1000px);
		}
	}

	section.details > section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	section.details h1 {
		font-size: var(--font-size-xl);
		margin-bottom: 0;
	}

	section.details h2 {
		font-size: var(--font-size-xxs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-on-surface-variant);
		margin: 0;
	}

	.byline {
		font-size: var(--font-size-xs);
		color: var(--color-on-surface-variant);
		margin: calc(-1 * var(--space-4)) 0 0;
	}

	.empty-note {
		color: var(--color-on-surface-variant);
		font-style: italic;
	}

	.info {
		font-size: var(--font-size-xxs);
		color: var(--color-on-surface-variant);
	}

	.files-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		margin-top: var(--space-4);
	}

	.file {
		border: 1px solid var(--color-outline-variant);
		border-radius: 8px;
		overflow: hidden;
	}

	.file-header {
		display: flex;
		justify-content: space-between;
		border-bottom: 1px solid var(--color-outline-variant);
	}

	.file-filename {
		padding: var(--space-2) var(--space-4);
		font-family: var(--font-mono-name);
		font-size: var(--font-size-xs);
	}

	.file-controls {
		border-left: solid var(--color-outline-variant) 1px;
		display: flex;
	}

	.file-format {
		display: flex;
		align-items: center;
		padding-left: var(--space-3);
		padding-right: var(--space-3);
		font-size: var(--font-size-xxs);
		text-transform: uppercase;
		border-right: solid var(--color-outline-variant) 1px;
	}

	.file-download {
		display: flex;
		align-items: center;
		padding-left: var(--space-3);
		padding-right: var(--space-3);
		min-width: 45px;
		flex: none;
	}

	.file-download a {
		display: flex;
		align-items: center;
	}

	.tags-container {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		font-size: var(--font-size-xxs);
	}

	.tags-container .tag {
		text-decoration: none;
		color: var(--color-on-surface);
		opacity: 0.6;
		padding: var(--space-1);
		border-radius: 5px;
		border: 1px solid var(--color-surface-container-lowest);
		transition: all 0.1s ease-in-out;
	}

	.tags-container .tag:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
		background-color: var(--color-surface-container-lowest);
		opacity: 1;
	}

	:global(.file-content pre.shiki) {
		font-size: var(--font-size-xxs);
	}

	:global(.file-content pre.shiki code) {
		counter-reset: step;
		counter-increment: step 0;
	}

	:global(.file-content pre.shiki code .line::before) {
		content: counter(step);
		counter-increment: step;
		width: 1rem;
		margin-right: 1.5rem;
		display: inline-block;
		text-align: right;
		color: var(--color-on-primary-container);
		opacity: 0.3;
	}
</style>
