<script lang="ts">
	import type { ActionData, PageData } from './$types'
	import MarkdownEditor from '$lib/components/editor/MarkdownEditor.svelte'
	import Button from '$lib/components/ui/Button.svelte'
	import { page } from '$app/state'
	import { enhance } from '$app/forms'
	import { goto, invalidateAll } from '$app/navigation'

	let { data, form }: { data: PageData; form: ActionData } = $props()

	let selectedField = $state<string>(form?.targetField || 'all')
	let prompt = $state(form?.prompt || '')
	let mergedContent = $state(form?.mergedContent || '')
	let saveError = $state<string | null>(null)

	const returnTo = page.url.searchParams.get('returnTo')
	const backUrl = returnTo || `/admin/piece/${data.file}/source`

	$effect(() => {
		if (form?.mergedContent) {
			mergedContent = form.mergedContent
		}
	})
</script>

{#if form && !form.error}
	<section class="review">
		<div class="header">
			<div
				style="display:flex; gap: var(--space-2); justify-content: flex-end; margin-bottom: var(--space-2);"
			>
				<form
					method="post"
					action="/admin/piece/{data.file}/source?/save"
					use:enhance={() => {
						saveError = null
						return async ({ result }) => {
							if (result.type === 'success') {
								await invalidateAll()
								goto(backUrl)
							} else if (result.type === 'failure') {
								const data = result.data as { error?: { message?: string } } | undefined
								saveError = data?.error?.message || 'Failed to save piece'
							} else if (result.type === 'error') {
								saveError = result.error?.message || 'An unexpected error occurred'
							} else if (result.type === 'redirect') {
								await goto(result.location)
							}
						}
					}}
				>
					<input type="hidden" name="content" value={mergedContent} />
					<Button type="submit">save</Button>
				</form>
				<a href={backUrl}>
					<Button variant="outline">cancel</Button>
				</a>
			</div>
		</div>
		{#if saveError}
			<div class="banner error-banner" role="alert">{saveError}</div>
		{/if}
		<div class="editor-container">
			<MarkdownEditor
				bind:value={mergedContent}
				file={data.file}
				returnTo={page.url.pathname + page.url.search}
			/>
		</div>
	</section>
{:else}
	<section class="generate">
		<form method="post" enctype="multipart/form-data">
			<div class="piece-container">
				{#if form?.error}
					<div class="banner error-banner" role="alert">{form.error.message}</div>
				{/if}

				<div class="field">directory</div>
				<div class="field-edit">{data.directory || '(root)'}</div>

				<div class="field">type</div>
				<div class="field-edit">{data.type}</div>

				<div class="field">field to generate</div>
				<div class="field-edit">
					<select name="field" class="input" bind:value={selectedField}>
						<option value="all">All Fields</option>
						{#each data.schema as field (field.name)}
							<option value={field.name}>{field.name}</option>
						{/each}
					</select>
				</div>

				<div class="field">file (optional)</div>
				<div class="field-edit">
					<input
						type="file"
						name="files"
						class="input"
						accept="application/pdf, application/json, text/html, .txt, image/png, image/jpeg, .csv"
						multiple
					/>
					{#if form?.error}
						<p>Reselect any attachments before retrying.</p>
					{/if}
				</div>

				<div class="field">prompt (optional)</div>
				<div class="field-edit">
					<textarea
						name="prompt"
						class="input"
						style="width:100%;height:200px;"
						bind:value={prompt}
						placeholder="Describe the changes or provide instructions for generating metadata..."
					></textarea>
				</div>

				<div style="display:flex;justify-content:space-between;">
					<Button type="submit">generate</Button>
					<a href={backUrl}>
						<Button variant="outline">cancel</Button>
					</a>
				</div>
			</div>
		</form>
	</section>
{/if}

<style>
	div.field {
		font-size: 80%;
		padding-bottom: 5px;
	}

	div.field-edit {
		padding-bottom: 10px;
	}

	section.generate,
	section.review {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.banner {
		padding: var(--space-3);
		border-radius: var(--radius-small);
		margin-bottom: var(--space-2);
		font-size: 0.875rem;
	}

	.error-banner {
		background-color: var(--color-error-container);
		color: var(--color-on-error-container);
		border: 1px solid var(--color-error);
	}

	@media screen and (min-width: 768px) {
		section.generate,
		section.review {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
