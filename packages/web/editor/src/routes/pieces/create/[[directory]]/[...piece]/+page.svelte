<script lang="ts">
	import FieldEdit from '$lib/pieces/components/fields/edit.svelte'

	let { data, form } = $props()
	let selectType: HTMLSelectElement | null = $state(null)
	let editSlug: HTMLInputElement | null = $state(null)
	let pieceType = $state<string>(data.type)
	let initialPrompt = $derived<string>(
		`please generate a json piece of type ${pieceType} for the date ${new Date().toLocaleDateString()}.\n\nuse any attached files and/or text below as
priority sources to extract the desired fields from.`
	)

	$effect(() => {
		if (selectType && (!form || form.error)) {
			selectType.focus()
		} else if (editSlug) {
			editSlug.focus()
			editSlug.select()
		}
	})
</script>

{#if form && !form.error}
	<section class="edit">
		<form method="post" enctype="multipart/form-data" action="?/create">
			<div class="piece-container">
				<div class="field">directory</div>
				<div class="field-edit">
					{form.directory}
					<input type="hidden" name="directory" value={form.directory} />
				</div>
				<div class="field">filename ({form.type})</div>
				<div class="field-edit">
					<input type="hidden" name="type" value={form.type} required />
					<input
						type="text"
						name="name"
						value={form.name}
						required
						bind:this={editSlug}
						style="width:100%;"
					/>
				</div>
				{#each form.fields || [] as field, index (index)}
					<div class="field">{field.name}</div>
					<div class="field-edit">
						<FieldEdit {field} value={form.markdown.frontmatter[field.name]} />
					</div>
				{/each}
				<div class="field">note</div>
				<div class="field-edit">
					<textarea name="note" style="width: 100%;height:300px;">{form.markdown.note}</textarea>
				</div>
				<div style="display:flex;justify-content:space-between;">
					<button type="submit">create</button>
					<button>
						<a href="/directory/list/{data.directory}">cancel</a>
					</button>
				</div>
			</div>
		</form>
	</section>
{:else}
	<section class="create">
		<form method="post" enctype="multipart/form-data" action="?/generate">
			<div class="piece-container">
				{#if form?.error}
					<div class="error" style="color:red;">
						{form.error.message}
					</div>
				{/if}
				<div class="field">directory</div>
				<div class="field-edit">{data.directory}</div>
				<div class="field">type</div>
				<div class="field-edit">
					<select
						name="type"
						required
						value={data.type}
						bind:this={selectType}
						onchange={(e) => (pieceType = e.currentTarget.value)}
					>
						{#each data.types as type, index (index)}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>
				<div class="field">file (optional)</div>
				<div class="field-edit">
					<input
						type="file"
						name="files"
						accept="application/pdf, application/json, text/html, .txt, image/png, image/jpeg, .csv"
						multiple
					/>
				</div>
				<div class="field">prompt (optional)</div>
				<div class="field-edit">
					<textarea name="prompt" style="width:100%;height:200px;" bind:value={initialPrompt}
					></textarea>
					>
				</div>
				<div>
					<button type="submit">generate</button>
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

	section.edit,
	section.create {
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
		section.edit,
		section.create {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
