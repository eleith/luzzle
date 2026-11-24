import type { Cookie, Page } from '@playwright/test'
import { expect, test } from './support/test.js'
import { ADMIN, fieldGuide, notebook } from './support/fixture.js'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { extractFullMarkdown } from '@luzzle/core'

let editorSession: Cookie[] | undefined

async function signIn(page: Page, editorUrl: string) {
	if (editorSession) await page.context().addCookies(editorSession)
	await page.goto(editorUrl)
	if (!editorSession) {
		const destination = new URL(editorUrl, page.url()).href
		await page.locator('#svelte-announcer').waitFor({ state: 'attached' })
		await page.getByLabel('Username', { exact: true }).fill(ADMIN.username)
		await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
		await page.getByRole('button', { name: 'Sign in', exact: true }).click()
		await expect(page).toHaveURL(destination)
		editorSession = await page.context().cookies()
	}
	// The toolbar is server-rendered; CodeMirror's textbox only exists after mount.
	await expect(page.getByRole('textbox')).toBeEditable()
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

test('the editor opens the published page directly, with a separate admin details link', async ({
	page,
	baseURL
}) => {
	await signIn(page, notebook.editorUrl)
	await page.getByRole('button', { name: 'More', exact: true }).click()
	const view = page.getByRole('group', { name: 'View', exact: true })
	await expect(view.getByRole('menuitem')).toHaveText([
		'Preview draft',
		'Public page',
		'Published details'
	])
	await expect(view.getByRole('menuitem', { name: 'Published details' })).toHaveJSProperty(
		'href',
		`${baseURL}${notebook.publishedUrl}`
	)
	await view.getByRole('menuitem', { name: 'Public page' }).click()
	await expect(page).toHaveURL(`${baseURL}${notebook.publicUrl}`)
	await expect(page.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()
})

test('publication adds the public link and confirmed unpublish removes it even if refresh fails', async ({
	page,
	appServer
}) => {
	const file = 'draft.notes.md'
	const editorUrl = `/admin/piece/${file}/source`
	await writeFile(
		path.join(appServer.directory, 'archive', file),
		'---\ntitle: Draft\ndate: 2024-01-01\n---\n\nDraft body.\n'
	)
	await signIn(page, editorUrl)
	const more = page.getByRole('button', { name: 'More', exact: true })
	const publicPage = page.getByRole('menuitem', { name: 'Public page', exact: true })
	await more.click()
	await expect(page.getByRole('menuitem', { name: 'Preview draft' })).toBeVisible()
	await expect(publicPage).toHaveCount(0)
	await expect(page.getByRole('menuitem', { name: 'Published details' })).toHaveCount(0)
	await page.keyboard.press('Escape')

	await page.route('**/api/admin/publish', (route) =>
		route.fulfill({ status: 202, json: { jobId: 'first-publication' } })
	)
	await page.route('**/api/admin/publish/first-publication/stream', (route) =>
		route.fulfill({
			contentType: 'text/event-stream',
			body: 'event: done\ndata: {"workflowName":"Publish","state":"completed","result":"ok"}\n\n'
		})
	)
	const publicPath = '/pieces/notes/new-public-slug'
	await page.route(`**/api/admin/publish?filePath=${file}`, (route) =>
		route.fulfill({
			json: { hasPublishedVersion: true, markdownPublicationStatus: 'matching', publicPath }
		})
	)
	await page.getByRole('button', { name: 'Publish', exact: true }).click()
	await expect(page.locator('.editor-publication-status')).toHaveText('Up to date')
	await more.click()
	await expect(publicPage).toHaveAttribute('href', `${appServer.origin}${publicPath}`)

	await page.route('**/api/admin/unpublish', (route) =>
		route.fulfill({ status: 202, json: { jobId: 'remove-publication' } })
	)
	await page.route('**/api/admin/publish/remove-publication/stream', (route) =>
		route.fulfill({
			contentType: 'text/event-stream',
			body: 'event: done\ndata: {"workflowName":"Unpublish","state":"completed","result":"ok"}\n\n'
		})
	)
	await page.route(`**/api/admin/publish?filePath=${file}`, (route) =>
		route.fulfill({ status: 500, json: { message: 'Status temporarily unavailable' } })
	)
	await page.getByRole('menuitem', { name: 'Unpublish', exact: true }).click()
	await expect(page.getByRole('alert')).toContainText('Unable to refresh publication status')
	await more.click()
	await expect(page.getByRole('menuitem', { name: 'Preview draft' })).toBeVisible()
	await expect(publicPage).toHaveCount(0)
	await expect(page.getByRole('menuitem', { name: 'Published details' })).toHaveCount(0)
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
	await page.getByRole('menuitem', { name: 'Preview draft', exact: true }).click()
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

test('asset URL saves update an unchanged editor but never replace a newer draft', async ({
	page,
	baseURL,
	appServer
}) => {
	await signIn(page, fieldGuide.editorUrl)
	const editor = page.getByRole('textbox')
	const save = page.getByRole('button', { name: 'Save', exact: true })
	const sourceInput = page.locator('input[name="content"]')
	const assetUrl = `${baseURL}/assets/pieces/${notebook.slug}/share%20image.png`
	const body = `\nBody with ${assetUrl}.\n`
	const draft = `---\n# formatting may change on URL conversion\ntitle:   "${fieldGuide.title}"\ndate: 2024-01-01\ncover: '${assetUrl}'\n---\n${body}`
	await editor.press('ControlOrMeta+a')
	await page.keyboard.insertText(draft)
	await page.getByRole('button', { name: 'More', exact: true }).click()
	await page.getByRole('menuitemcheckbox', { name: 'Vim mode', exact: true }).click()
	const mode = page.locator('.cm-editor .editor-status-mode')
	await editor.press('i')
	await expect(mode).toHaveText('Insert')
	await save.click()
	await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled()
	const file = path.join(appServer.directory, 'archive', fieldGuide.file)
	const savedContent = await readFile(file, 'utf8')
	const { frontmatter } = await extractFullMarkdown(savedContent)
	expect(frontmatter.cover).toMatch(/^\.assets\/.+\/.+\.png$/)
	expect(savedContent.endsWith(`---\n${body}`)).toBe(true)
	const downloaded = await readFile(
		path.join(appServer.directory, 'archive', frontmatter.cover as string)
	)
	expect(downloaded).toEqual(
		await readFile(
			path.join(appServer.directory, 'assets/pieces', notebook.slug, 'share image.png')
		)
	)
	await expect(sourceInput).toHaveValue(savedContent)
	await expect(editor).toContainText(frontmatter.cover as string)
	await expect(mode).toHaveText('Normal')

	await page.getByRole('button', { name: 'More', exact: true }).click()
	await page.getByRole('menuitemcheckbox', { name: 'Vim mode', exact: true }).click()
	const secondUrl = `${assetUrl}?second=1`
	const secondDraft = draft.replace(`cover: '${assetUrl}'`, `cover: '${secondUrl}'`)
	await editor.press('ControlOrMeta+a')
	await page.keyboard.insertText(secondDraft)
	const responseReady = Promise.withResolvers<void>()
	const releaseResponse = Promise.withResolvers<void>()
	await page.route(
		(url) => url.pathname === fieldGuide.editorUrl && url.searchParams.has('/save'),
		async (route) => {
			const response = await route.fetch()
			expect(response.status()).toBe(200)
			responseReady.resolve()
			await releaseResponse.promise
			await route.fulfill({ response })
		}
	)
	try {
		await save.click()
		await responseReady.promise
		await editor.press('ControlOrMeta+End')
		await page.keyboard.insertText('\nTyped while Save was pending.')
		await expect(sourceInput).toHaveValue(/Typed while Save was pending\./)
		const newerDraft = await sourceInput.inputValue()
		expect(newerDraft).toContain(secondUrl)
		releaseResponse.resolve()
		await expect(save).toBeEnabled()
		await expect(sourceInput).toHaveValue(newerDraft)
		await expect(editor).toContainText('Typed while Save was pending.')
		expect(await readFile(file, 'utf8')).not.toContain('Typed while Save was pending.')
	} finally {
		releaseResponse.resolve()
	}
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
