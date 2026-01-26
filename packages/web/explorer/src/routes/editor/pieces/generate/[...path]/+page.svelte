<script lang="ts">
	import type { ActionData, PageData } from './$types'
	import PieceForm from '$lib/components/editor/PieceForm.svelte'
	import Button from '$lib/components/ui/Button.svelte'

	let { data, form }: { data: PageData; form: ActionData } = $props()

	let selectedField = $state<string>('all')
	let prompt = $state(`generate all fields for this ${data.type} piece.`)
	let generatedFields = $state(form?.fields || {})

	$effect(() => {
		if (form?.fields) {
			generatedFields = form.fields
		}
	})

	function onFieldChange() {
		if (selectedField === 'all') {
			prompt = `generate all fields for this ${data.type} piece.`
		} else {
			prompt = `generate the ${selectedField} field for this ${data.type} piece.`
		}
	}
</script>

{#if form && !form.error}
	<section class="review">
		{#snippet buttons()}
			<Button type="submit">save</Button>
			<a href="/editor/pieces/view/{data.file}">
				<Button variant="outline">cancel</Button>
			</a>
		{/snippet}

		<PieceForm
			action="/editor/pieces/edit/{data.file}?/edit"
			schema={data.schema}
			values={generatedFields}
			originalValues={data.fields}
			note={form.note || ''}
			{buttons}
		/>
	</section>
{:else}
	<section class="generate">
		<form method="post" enctype="multipart/form-data">
			<div class="piece-container">
				{#if form?.error}
					<div class="error" style="color:var(--color-error);">
						{form.error.message}
					</div>
				{/if}

				<div class="field">directory</div>
				<div class="field-edit">{data.directory || '(root)'}</div>

				<div class="field">type</div>
				<div class="field-edit">{data.type}</div>

				<div class="field">field to generate</div>
				<div class="field-edit">
					<select name="field" class="input" bind:value={selectedField} onchange={onFieldChange}>
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
				</div>

				<div class="field">prompt (optional)</div>
				<div class="field-edit">
					<textarea
						name="prompt"
						class="input"
						style="width:100%;height:200px;"
						bind:value={prompt}
					></textarea>
				</div>

				<div style="display:flex;justify-content:space-between;">
					<Button type="submit">generate</Button>
					<a href="/editor/pieces/view/{data.file}">
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

	@media screen and (min-width: 768px) {
		section.generate,
		section.review {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
