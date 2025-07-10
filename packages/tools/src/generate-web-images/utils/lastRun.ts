import { existsSync, readFileSync, writeFileSync } from 'fs'

const LastRunFile = '.lastRun'

async function getLastRunData(folder: string) {
	try {
		if (!existsSync(`${folder}/${LastRunFile}`) === false) {
			const lastRunJson = readFileSync(`${folder}/${LastRunFile}`, 'utf-8')
			return JSON.parse(lastRunJson)
		}
		return {}
	} catch {
		return {}
	}
}

async function getLastRunFor(folder: string, operation: string) {
	try {
		const data = await getLastRunData(folder)
		return new Date(data[operation] || new Date(0))
	} catch {
		return new Date(0)
	}
}

async function setLastRunFor(folder: string, operation: string, date: Date) {
	const data = await getLastRunData(folder)
	data[operation] = date.toISOString()
	writeFileSync(`${folder}/${LastRunFile}`, JSON.stringify(data, null, 2))
}

export { getLastRunData, getLastRunFor, setLastRunFor }
