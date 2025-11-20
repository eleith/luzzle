import { access, constants, readFile, writeFile } from 'fs/promises'

const LastRunFile = '.lastRun'

async function getLastRunData(folder: string) {
	try {
		await access(`${folder}/${LastRunFile}`, constants.R_OK)
		const lastRunJson = await readFile(`${folder}/${LastRunFile}`, 'utf-8')
		return JSON.parse(lastRunJson)
	} catch {
		return {}
	}
}

async function getLastRunFor(folder: string, operation: string) {
	const data = await getLastRunData(folder)
	return new Date(data[operation] || new Date(0))
}

async function setLastRunFor(folder: string, operation: string, date: Date) {
	const data = await getLastRunData(folder)
	data[operation] = date.toISOString()
	await writeFile(`${folder}/${LastRunFile}`, JSON.stringify(data, null, 2))
}

export { getLastRunData, getLastRunFor, setLastRunFor }
