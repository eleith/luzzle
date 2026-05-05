<script lang="ts">
	import { type PiecePageProps } from '$lib/pieces/helpers'
	import FileDownIcon from 'virtual:icons/ph/file-arrow-down'
	const { piece, tags, helpers }: PiecePageProps = $props()
	const metadata = piece.metadata

	const bylineParts: string[] = [];
	if (metadata.files?.length) {
		const formats = [...new Set(metadata.files.map((f: { format: string }) => f.format).filter(Boolean))];
		if (formats.length) bylineParts.push(formats.join(', '));
		bylineParts.push(metadata.files.length > 1 ? `${metadata.files.length} files` : '1 file');
	}
	if (piece.date_consumed) {
		bylineParts.push(
			new Date(piece.date_consumed).toLocaleDateString("en-US", { timeZone: "UTC" }).replaceAll("/", "."),
		);
	}
</script>

<section class="content">
	<section class="details">
		<h1>
			{piece.title}
		</h1>

		{#if bylineParts.length}
			<p class="byline">{bylineParts.join(" · ")}</p>
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

		{#if piece.metadata.files && piece.metadata.files.length > 0}
			<section class="note">
				<h2>Files</h2>
			<div class="files-container">
				{#each piece.metadata.files as file (file.name)}
					{@const attachment = helpers.getPieceAssetUrl(file.file, 'attachment')}

					{#if file.type === 'snippet'}
						{@const highlight = helpers.getPieceAssetContent(file.file, 'highlight')}
						<div class="file">
							<div class="file-header">
								<div class="file-filename">{file.name}</div>
								<div class="file-controls">
									<div class="file-format">{file.format}</div>
									{#if attachment}
										<div class="file-download">
											<a href={attachment} aria-label="download {file.name}"><FileDownIcon style="font-size: 1rem;" /></a>
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
					{:else}
						<div class="file">
							<div class="file-header">
								<span class="file-filename">{file.file}</span>
								<span class="file-controls">
									<span class="file-format">{file.format}</span>
									{#if attachment}
										<span class="file-download">
											<a href={attachment} aria-label="download {file.file}"><FileDownIcon style="font-size: 1rem;" /></a>
										</span>
									{/if}
								</span>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</section>
		{/if}

		{#if piece.metadata.date_updated}
			<div class="info">
				last updated: {new Date(piece.metadata.date_updated).toLocaleDateString("en-US", {
					timeZone: 'UTC'
				}).replaceAll("/", ".")}
			</div>
		{/if}
		{#if tags.length}
			<div class="section">
				<div class="tags-container">
					{#each tags as tag (tag.slug)}
						<a href="/tags/{tag.slug}" class="tag">#{tag.tag?.toLowerCase()}</a>
					{/each}
				</div>
			</div>
		{/if}
	</section>
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
