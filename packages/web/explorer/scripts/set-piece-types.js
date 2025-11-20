import { loadConfig } from '@luzzle/web.utils/server'
import fs from 'fs'
import path from 'path'

const ENV_FILE = '.env'
const KEY_TO_UPDATE = 'PUBLIC_LUZZLE_PIECE_TYPES'

const config = loadConfig('./config.yaml')
const pieceTypes = config.pieces.map((p) => p.type).join(',')
const envPath = path.join(process.cwd(), ENV_FILE)
const replacementLine = `${KEY_TO_UPDATE}=${pieceTypes}`
const exists = fs.existsSync(envPath)

if (exists) {
	const fileContent = fs.readFileSync(envPath, 'utf8')
	const regex = new RegExp(`^${KEY_TO_UPDATE}=.*$`, 'm')

	if (regex.test(fileContent)) {
		const newContent = fileContent.replace(regex, replacementLine)
		fs.writeFileSync(envPath, newContent, 'utf8')

		console.log(`Updated ${KEY_TO_UPDATE} in ${ENV_FILE}.`)
	} else {
		const prefix = fileContent.length > 0 && !fileContent.endsWith('\n') ? '\n' : ''
		const newContent = fileContent + prefix + replacementLine
		fs.writeFileSync(envPath, newContent, 'utf8')

		console.log(`Appended ${KEY_TO_UPDATE} to ${ENV_FILE}.`)
	}
} else {
	const newContent = `${KEY_TO_UPDATE}=${pieceTypes}\n`
	fs.writeFileSync(envPath, newContent, 'utf8')

	console.log(`Created ${ENV_FILE} with ${KEY_TO_UPDATE}.`)
}
