<script lang="ts">
	let { data } = $props()
	let mode: 'edit' | 'preview' = $state('preview')
	let formElement = $state<HTMLFormElement>()

	function submit() {
		formElement?.submit()
	}

	function formatDateStringForInput(dateString: string): string | null {
		if (!dateString) {
			return null
		}

		try {
			const date = new Date(dateString)

			if (isNaN(date.getTime())) {
				return null // Invalid date
			}

			const year = date.getUTCFullYear()
			const month = String(date.getUTCMonth() + 1).padStart(2, '0')
			const day = String(date.getUTCDate()).padStart(2, '0')

			return `${year}-${month}-${day}`
		} catch (error) {
			console.log(error)
			return null
		}
	}
</script>

<section class="toolbar">
	{#if mode === 'preview'}
		<button onclick={() => (mode = 'edit')}>edit</button>
	{:else if mode === 'edit'}
		<button onclick={() => (mode = 'preview')}>cancel</button>
		<button onclick={submit}>save</button>
	{/if}
	<div><a href="/directory/{data.directory}">{data.directory}</a></div>
</section>

{#if mode === 'preview'}
	<section class="preview">
		<div class="piece-container">
			{#each data.schema as field}
				<div class="field">{field.name}</div>
				{#if data.fields[field.name]}
					{#if field.format === 'asset'}
						<div><a href="/asset/{data.fields[field.name]}">{data.fields[field.name]}</a></div>
					{:else}
						<div>{data.fields[field.name]}</div>
					{/if}
				{:else}
					<div><em>empty</em></div>
				{/if}
			{/each}
			<div class="field">note</div>
			<div>{data.note}</div>
		</div>
	</section>
{:else if mode === 'edit'}
	<section class="edit">
		<form method="post" bind:this={formElement} enctype="multipart/form-data">
			<div class="piece-container">
				{#each data.schema as field}
					<div class="field">{field.name}</div>
					{#if field.format === 'asset'}
						<div>
							<input type="file" name="upload.{field.name}" />
							<input
								type="hidden"
								name="frontmatter.{field.name}"
								value={data.fields[field.name]}
							/>
						</div>
					{:else if field.format === 'date'}
						<div>
							<input
								type="date"
								name="frontmatter.{field.name}"
								value={formatDateStringForInput(data.fields[field.name] as string) || ''}
							/>
						</div>
					{:else if field.type === 'integer'}
						<div>
							<input
								type="number"
								name="frontmatter.{field.name}"
								value={data.fields[field.name]}
							/>
						</div>
					{:else if field.type === 'boolean'}
						<div>
							<select name="frontmatter.{field.name}" value={data.fields[field.name] ? 1 : 0}>
								<option value="1">true</option>
								<option value="0">false</option>
							</select>
						</div>
					{:else if field.enum}
						<div>
							<select name="frontmatter.{field.name}" value={data.fields[field.name]}>
								{#each field.enum as option}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</div>
					{:else}
						<div>
							<input type="text" name="frontmatter.{field.name}" value={data.fields[field.name]} />
						</div>
					{/if}
				{/each}
				<div class="field">note</div>
				<div>
					<textarea name="note">{data.note}</textarea>
				</div>
			</div>
		</form>
	</section>
{/if}

<style>
	section.edit,
	section.preview {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	section.toolbar {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: row;
		gap: var(--space-4);
	}

	@media screen and (min-width: 768px) {
		section.edit,
		section.preview,
		section.toolbar {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}

	div.piece-container {
		display: grid;
		grid-template-columns: 1fr 3fr;
		gap: 5px;
	}

	div.field {
		justify-self: end;
	}
</style>
