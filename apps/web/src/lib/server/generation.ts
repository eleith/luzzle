import { error } from '@sveltejs/kit'
import { config } from './config'
import { readCreateInput, readEditInput } from './generation/input'
import { createDraftGenerator, createEditorGenerator, type Generate } from './generation/generator'
import { generationStream } from './generation/stream'
import { MAX_CONCURRENT_GENERATIONS } from './constants'

let active = 0

export async function generateResponse(request: Request): Promise<Response> {
	const ai = config.ai
	if (!ai) error(503, 'AI is not configured.')
	if (active >= MAX_CONCURRENT_GENERATIONS) error(429, 'Generation is busy. Please try again.')

	// Reserve before consuming multipart data; disconnected accepted work still owns its slot.
	active++
	const release = () => active--
	try {
		const form = await request.formData()
		const mode = form.get('mode')
		let generate: Generate
		if (mode === 'create') {
			const input = await readCreateInput(form)
			generate = await createDraftGenerator(input, ai.api_key)
		} else if (mode === 'edit') {
			const input = await readEditInput(form)
			generate = await createEditorGenerator(input, ai.api_key)
		} else {
			error(400, 'Choose creation or editing.')
		}
		return generationStream(request, generate, release)
	} catch (cause) {
		release()
		throw cause
	}
}
