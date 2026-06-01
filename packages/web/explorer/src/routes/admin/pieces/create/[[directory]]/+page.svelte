<script lang="ts">
	import { goto } from '$app/navigation'
	import Button from '$lib/components/ui/Button.svelte'
	import MarkdownEditor from '$lib/components/editor/MarkdownEditor.svelte'

	let { data, form } = $props()
	let selectedType = $state(data.type)
	let selectedDirectory = $state(data.directory || '.')
	let shouldGenerate = $state(false)
	let prompt = $state('')
	let mergedContent = $state(form?.mergedContent || '')

	$effect(() => {
		if (form?.mergedContent) {
			mergedContent = form.mergedContent
		}
	})

	function onTypeChange() {
		const url = new URL(window.location.href)
		url.searchParams.set('type', selectedType)
		goto(url.toString())
	}

	const defaultPrompt = $derived(`generate all fields for this ${data.type} piece.`)
	const isReview = $derived(!!(form && form.mergedContent && !form.error))
	const filePath = $derived(form?.filePath || '')
</script>

{#if isReview}
	<section class="review">
		<div class="header">
			<div
				style="display:flex; gap: var(--space-2); justify-content: flex-end; margin-bottom: var(--space-2);"
			>
				<form method="post" action="/admin/piece/{filePath}/source">
					<input type="hidden" name="content" value={mergedContent} />
					<Button type="submit">save</Button>
				</form>
				<a href="/admin/piece/{filePath}/source">
					<Button variant="outline">cancel</Button>
				</a>
			</div>
		</div>
		<div class="editor-container">
			<MarkdownEditor bind:value={mergedContent} file={filePath} />
		</div>
	</section>
{:else}
	<section class="create">
		<form method="post" enctype="multipart/form-data" action="?/create">
			<div class="piece-container">
				{#if form?.error}
					<div class="error" style="color:var(--color-error); margin-bottom: var(--space-4);">
						{form.error.message}
					</div>
				{/if}
				<div class="field">directory</div>
				<div class="field-edit">
					<!-- svelte-ignore a11y_autofocus -->
					<select name="directory" class="input" bind:value={selectedDirectory} autofocus>
						{#each data.directories as dir (dir)}
							<option value={dir}>{dir === '.' ? '(root)' : dir}</option>
						{/each}
					</select>
				</div>
				<div class="field">type</div>
				<div class="field-edit">
					<select name="type" class="input" bind:value={selectedType} onchange={onTypeChange}>
						{#each data.types as type (type)}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>
				<div class="field">name</div>
				<div class="field-edit">
					<input
						type="text"
						name="name"
						class="input"
						value="new-{selectedType}"
						required
						style="width:100%;"
					/>
				</div>

				{#if data.canGenerate}
					<div class="generate-section">
						<label class="generate-toggle">
							<input type="checkbox" name="generate" value="true" bind:checked={shouldGenerate} />
							Generate metadata with AI
						</label>

						{#if shouldGenerate}
							<div class="generation-fields">
								<div class="field">file (optional)</div>
								<div class="field-edit">
									<input
										type="file"
										name="files"
										class="input"
										accept="application/pdf, application/json, text/html, .txt, image/png, image/jpeg, .csv"
										multiple
									/>
								</div>

								<div class="field">prompt (optional)</div>
								<div class="field-edit">
									<textarea
										name="prompt"
										class="input"
										style="width:100%;height:150px;"
										placeholder={defaultPrompt}
										bind:value={prompt}
									></textarea>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<div style="display:flex;justify-content:space-between;">
					<Button type="submit">
						{shouldGenerate ? 'create & generate' : 'create'}
					</Button>
					<a href="/admin/directory/{data.directory}">
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

	section.create,
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

	.header {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.generate-section {
		margin: var(--space-3) 0;
		padding: var(--space-3);
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-small);
	}

	.generate-toggle {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
		font-size: 90%;
	}

	.generation-fields {
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-outline-variant);
	}

	@media screen and (min-width: 768px) {
		section.create,
		section.review {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
