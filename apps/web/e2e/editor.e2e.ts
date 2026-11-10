import type { Cookie, Page } from '@playwright/test'
import { expect, test } from './support/test.js'
import { ADMIN, notebook } from './support/fixture.js'

let editorSession: Cookie[] | undefined

async function signIn(page: Page, editorUrl: string) {
	if (editorSession) {
		await page.context().addCookies(editorSession)
		await page.goto(editorUrl)
		return
	}
	await page.goto(editorUrl)
	const destination = new URL(editorUrl, page.url()).href
	await page.locator('#svelte-announcer').waitFor({ state: 'attached' })
	await page.getByLabel('Username', { exact: true }).fill(ADMIN.username)
	await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
	await page.getByRole('button', { name: 'Sign in', exact: true }).click()
	await expect(page).toHaveURL(destination)
	editorSession = await page.context().cookies()
}

test.beforeEach(async ({ page }) => {
	// Allow real read-only metadata, but never start live publication or Preview jobs.
	await page.route(/\/api\/admin\/(?:publish|unpublish)(?:\/[^?]*)?(?:\?.*)?$/, (route) => {
		const request = route.request()
		if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/admin/publish') {
			return route.fallback()
		}
		return route.abort()
	})
	await page.route(/\/admin\/piece\/.*\/preview(?:\/[^?]*)?(?:\?.*)?$/, (route) => route.abort())
})

test('Save persists source; Vim menu changes preserve history and :w keeps focus and cursor', async ({
	page,
	baseURL
}) => {
	await signIn(page, notebook.editorUrl)
	const editor = page.getByRole('textbox')
	const saved = page.getByRole('button', { name: 'Saved', exact: true })
	const more = page.getByRole('button', { name: 'More', exact: true })
	const vim = page.getByRole('menuitemcheckbox', { name: 'Vim mode', exact: true })
	const mode = page.locator('.cm-editor .editor-status-mode')
	const observation = 'A saved observation from the browser.'
	await editor.press('ControlOrMeta+End')
	await page.keyboard.insertText(`\n\n${observation}`)
	await page.getByRole('button', { name: 'Save', exact: true }).click()
	await expect(saved).toBeDisabled()
	await page.reload()
	await expect(editor).toContainText(observation)
	const savedSource = await editor.innerText()

	const draftLine = 'A draft kept while switching keybindings.'
	const quotedTitleSource = savedSource.replace(/^title:.*$/m, `title:   "${notebook.title}"`)
	const draftSource = `${quotedTitleSource.trimEnd()}\n\n${draftLine}\n`
	await editor.press('ControlOrMeta+a')
	await page.keyboard.insertText(draftSource)
	await more.click()
	await expect(vim).not.toBeChecked()
	await vim.click()
	await expect(editor).toBeFocused()
	await expect(mode).toHaveText('Normal')
	await more.click()
	await vim.click()
	await expect(editor).toBeFocused()
	await editor.press('ControlOrMeta+z')
	await expect(editor).toHaveText(savedSource, { useInnerText: true })
	await editor.press('ControlOrMeta+Shift+z')
	await expect(editor).toHaveText(draftSource, { useInnerText: true })

	await more.click()
	await vim.click()
	await expect(editor).toBeFocused()
	const draftLineNumber = draftSource.slice(0, draftSource.indexOf(draftLine)).split('\n').length
	await page.keyboard.type(`${draftLineNumber}G$`)
	const cursorInLine = () =>
		editor.evaluate((content) => {
			const selection = window.getSelection()
			const node = selection?.focusNode
			const line = node?.parentElement?.closest('.cm-line')
			if (!selection || !node || !line || !content.contains(line)) return null
			const range = document.createRange()
			range.selectNodeContents(line)
			range.setEnd(node, selection.focusOffset)
			return { line: line.textContent, offset: range.toString().length }
		})
	const expectedCursor = { line: draftLine, offset: draftLine.length - 1 }
	await expect.poll(cursorInLine).toEqual(expectedCursor)
	await editor.press(':')
	const command = page.locator('.cm-editor .editor-vim-status input')
	await command.fill('w')
	await command.press('Enter')
	await expect(saved).toBeDisabled()
	await expect(editor).toContainText(`title: "${notebook.title}"`)
	await expect(editor).toBeFocused()
	await expect.poll(cursorInLine).toEqual(expectedCursor)
	await expect(page).toHaveURL(`${baseURL}${notebook.editorUrl}`)

	await page.reload()
	await expect(editor).toContainText(draftLine)
	await expect(editor).toContainText(`title: "${notebook.title}"`)
	await expect(mode).toHaveText('Normal')
	await more.click()
	await expect(vim).toBeChecked()
	const previewUrl = `${baseURL}${notebook.editorUrl.replace('/source', '/preview')}`
	await page.route(previewUrl, (route) =>
		route.fulfill({ status: 400, json: { type: 'failure', status: 400, data: null } })
	)
	const previewRequest = page.waitForRequest(previewUrl)
	await page.getByRole('menuitem', { name: 'Preview', exact: true }).click()
	expect((await previewRequest).method()).toBe('POST')

	const beforeFormat = await editor.innerText()
	let formatSaveRequests = 0
	page.on('request', (request) => {
		const url = new URL(request.url())
		if (request.method() === 'POST' && url.searchParams.has('/save')) formatSaveRequests++
	})
	await more.click()
	await page.getByRole('menuitem', { name: 'Format', exact: true }).click()
	await expect.poll(() => editor.innerText()).not.toBe(beforeFormat)
	await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
	await editor.press('u')
	await expect(editor).toHaveText(beforeFormat, { useInnerText: true })
	await expect(saved).toBeDisabled()
	expect(formatSaveRequests).toBe(0)
})

test('pending Publish allows saving and typing; failed metadata refresh retains the draft', async ({
	page,
	baseURL
}) => {
	const file = 'forest.notes.md'
	const editorUrl = '/admin/piece/forest.notes.md/source'
	const jobId = 'e2e-forest-publication'
	const streamUrl = `**/api/admin/publish/${jobId}/stream`
	let finishPublication!: () => void
	const publicationFinished = new Promise<void>((resolve) => {
		finishPublication = resolve
	})
	await page.route('**/api/admin/publish', (route) => {
		if (route.request().method() !== 'POST') return route.fallback()
		return route.fulfill({ status: 202, json: { jobId } })
	})
	await page.route(streamUrl, async (route) => {
		await publicationFinished
		await route.fulfill({
			contentType: 'text/event-stream',
			body: `event: done\ndata: ${JSON.stringify({
				workflowName: 'Publish',
				state: 'completed',
				result: 'ok',
				errors: null
			})}\n\n`
		})
	})
	try {
		await signIn(page, editorUrl)
		const editor = page.getByRole('textbox')
		const save = page.getByRole('button', { name: 'Save', exact: true })
		const saved = page.getByRole('button', { name: 'Saved', exact: true })
		const publishing = page.getByRole('button', { name: 'Publishing…', exact: true })
		const publication = page.locator('.cm-editor .editor-status .editor-publication-status')
		await expect(publication).toHaveText('Up to date')
		const acceptedRequest = page.waitForRequest(
			(request) =>
				request.method() === 'POST' && new URL(request.url()).pathname === '/api/admin/publish'
		)
		const pendingStream = page.waitForRequest(streamUrl)
		await page.getByRole('button', { name: 'More', exact: true }).click()
		await page.getByRole('menuitem', { name: 'Publish', exact: true }).click()
		expect((await acceptedRequest).postDataJSON()).toEqual({ filePath: file })
		await pendingStream
		await expect(publishing).toBeDisabled()

		await editor.press('ControlOrMeta+End')
		await page.keyboard.insertText('\n\nSaved while Publish is still running.')
		await expect(save).toBeEnabled()
		await save.click()
		await expect(saved).toBeDisabled()
		await expect(publishing).toBeDisabled()
		const savedSource = await editor.innerText()
		await editor.press('ControlOrMeta+End')
		await page.keyboard.insertText('\n\nUnsaved work must survive the metadata failure.')
		const draftSource = await editor.innerText()
		expect(draftSource).not.toBe(savedSource)

		await page.route(
			(url) => url.pathname === '/api/admin/publish' && url.searchParams.get('filePath') === file,
			(route) => route.fulfill({ status: 500, json: { message: 'Status temporarily unavailable' } })
		)
		finishPublication()
		await expect(page.getByRole('alert')).toContainText('Unable to refresh publication status')
		await expect(publication).toHaveAttribute('data-state', 'unknown')
		await expect(editor).toHaveText(draftSource, { useInnerText: true })
		await expect(page).toHaveURL(`${baseURL}${editorUrl}`)
		await expect(save).toBeEnabled()
	} finally {
		finishPublication()
	}
})
