import { expect, test } from './support/test.js'
import { ADMIN, notebook } from './support/fixture.js'

test('sign in, save an edit and reload the saved source', async ({ page, baseURL }) => {
	await page.goto(notebook.editorUrl)
	await page.locator('#svelte-announcer').waitFor({ state: 'attached' })
	await page.getByLabel('Username', { exact: true }).fill(ADMIN.username)
	await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
	await page.getByRole('button', { name: 'Sign in', exact: true }).click()
	await expect(page).toHaveURL(`${baseURL}${notebook.editorUrl}`)

	const editor = page.getByRole('textbox')
	const save = page.getByRole('button', { name: 'Save', exact: true })
	const observation = 'A saved observation from the browser.'
	await expect(editor).toContainText('Original observation.')
	await editor.press('ControlOrMeta+End')
	await page.keyboard.insertText(`\n\n${observation}`)
	await save.click()
	await expect(save).toBeDisabled()
	await page.reload()
	await expect(editor).toContainText(observation)
})
