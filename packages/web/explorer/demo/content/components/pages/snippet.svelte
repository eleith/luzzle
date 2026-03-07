<script lang="ts">
	import { type PiecePageProps } from '$lib/pieces/helpers'
	import FileDownIcon from 'virtual:icons/ph/file-arrow-down'
	const { piece, tags, html_note, helpers }: PiecePageProps = $props()
</script>

<section class="content">
	<section class="details">
		<h1>
			{piece.title}
		</h1>

		<div class="info">
			<div>
				{#if piece.summary}
					{piece.summary}
				{/if}
			</div>
			<div>
				{#if piece.date_added}
					<div>
						added on {new Date(piece.date_added).toLocaleDateString(undefined, {
							timeZone: 'UTC'
						})}
					</div>
				{/if}
				{#if piece.date_updated}
					<div>
						updated on {new Date(piece.date_updated).toLocaleDateString(undefined, {
							timeZone: 'UTC'
						})}
					</div>
				{/if}

				{#if piece.metadata.url}
					<div>
						<a href={piece.metadata.url}>{piece.metadata.url}</a>
					</div>
				{/if}
			</div>
		</div>

		{#if piece.note}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html html_note}
		{/if}

		{#if piece.metadata.files && piece.metadata.files.length > 0}
			<div class="notes-container">
				{#each piece.metadata.files as file (file.name)}
					{@const attachment = helpers.getPieceAssetUrl(file.file, 'attachment')}

					{#if file.type === 'snippet'}
						{@const highlight = helpers.getPieceAssetContent(file.file, 'highlight')}
						<div class="note">
							<div class="note-header">
								<div class="note-filename">{file.name}</div>
								<div class="note-controls">
									<div class="note-format">{file.format}</div>
									{#if attachment}
										<div class="note-download">
											<a href={attachment}><FileDownIcon style="font-size: 1rem;" /></a>
										</div>
									{/if}
								</div>
							</div>
							{#if highlight}
								<div class="note-content">
									{@html highlight}
								</div>
							{/if}
						</div>
					{:else}
						<div class="note">
							<div class="note-header">
								<span class="note-filename">{file.file}</span>
								<span class="note-controls">
									<span class="note-format">{file.format}</span>
									{#if attachment}
										<span class="note-download">
											<a href={attachment}><FileDownIcon style="font-size: 1rem;" /></a>
										</span>
									{/if}
								</span>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</section>

	{#if tags.length}
		<section class="tags-container">
			{#each tags as tag (tag.slug)}
				<a href="/tags/{tag.slug}" class="tag">{tag.tag}</a>
			{/each}
		</section>
	{/if}
</section>

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
	}

	@media screen and (min-width: 768px) {
		section.details {
			width: clamp(500px, 80%, 1000px);
		}
	}

	section.details h1 {
		font-size: var(--font-size-xl);
		margin-bottom: 0;
	}

	section.details .info {
		font-size: var(--font-size-xxs);
		color: var(--color-on-surface-variant);
		display: flex;
		justify-content: space-between;
	}

	.notes-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		margin-top: var(--space-4);
	}

	.note {
		border: 1px solid var(--color-outline-variant);
		border-radius: 8px;
		overflow: hidden;
	}

	.note-header {
		display: flex;
		justify-content: space-between;
		border-bottom: 1px solid #444;
	}

	.note-filename {
		padding: var(--space-2) var(--space-4);
		font-family: var(--font-mono-name);
		font-size: var(--font-size-xs);
	}

	.note-controls {
		border-left: solid var(--color-outline-variant) 1px;
		display: flex;
	}

	.note-format {
		display: flex;
		align-items: center;
		padding-left: var(--space-3);
		padding-right: var(--space-3);
		font-size: var(--font-size-xxs);
		text-transform: uppercase;
		border-right: solid var(--color-outline-variant) 1px;
	}

	.note-download {
		display: flex;
		align-items: center;
		padding-left: var(--space-3);
		padding-right: var(--space-3);
	}

	.note-download a {
		display: flex;
		align-items: center;
	}

	.tags-container {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		font-size: var(--font-size-xxs);
		justify-content: center;
		padding: var(--space-4);
		margin: auto;
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

	.note-content {
		overflow-x: auto;
		font-size: var(--font-size-xxs);
	}

	:global(.note-content pre.shiki code) {
		counter-reset: step;
		counter-increment: step 0;
	}

	:global(.note-content pre.shiki code .line::before) {
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
