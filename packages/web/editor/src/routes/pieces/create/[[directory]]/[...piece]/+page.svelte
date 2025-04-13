<script lang="ts">
	import FieldEdit from '$lib/pieces/components/fields/edit.svelte'

	let { data, form } = $props()
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
				<div class="field">slug</div>
				<div>
					{form.name}
					<input type="hidden" name="name" value={form.name} required />
				</div>
				<div class="field">type</div>
				<div>
					{form.type}
					<input type="hidden" name="type" value={form.type} required />
				</div>
				{#each form.fields || [] as field}
					<div class="field">{field.name}</div>
					<div>
						<FieldEdit {field} value={form.markdown.frontmatter[field.name]} />
					</div>
				{/each}
				<div class="field">note</div>
				<div class="field-edit">
					<textarea name="note" style="width: 100%;height:300px;"></textarea>
				</div>
				<div style="display:flex;justify-content:space-between;">
					<button type="submit">create</button>
					<button style="background-color:blue;"
						><a href="/directory/list/{data.directory}">cancel</a></button
					>
				</div>
			</div>
		</form>
	</section>
{:else}
	<section class="create">
		<form method="post" enctype="multipart/form-data" action="?/prompt">
			<div class="piece-container">
				{#if form?.error}
					<div class="error">
						{form.error.message}
					</div>
				{/if}
				<div class="field">directory</div>
				<div class="field-edit">{data.directory}</div>
				<div class="field">name</div>
				<div class="field-edit">
					<input type="text" name="name" required style="width:100%;" />
				</div>
				<div class="field">type</div>
				<div class="field-edit">
					<select name="type" required>
						{#each data.types as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>
				<div class="field">prompt</div>
				<div class="field-edit">
					<textarea name="prompt" style="width:100%;height:300px;"></textarea>
				</div>
				<div class="field">file</div>
				<div class="field-edit">
					<input type="file" name="file" accept=".pdf" />
				</div>
				<div>
					<button type="submit">prompt</button>
				</div>
			</div>
		</form>
	</section>
{/if}

<style>
	div.field {
		font-size: 80%;
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
