import { isUtf8 } from 'node:buffer'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

const MAX_SOURCE_BYTES = 100 * 1024

export async function readHighlightSource(
	filename: string,
	skip: (reason: string) => void
): Promise<string | undefined> {
	const fileStat = await stat(filename)
	if (fileStat.size > MAX_SOURCE_BYTES) {
		skip(`source exceeds ${MAX_SOURCE_BYTES} bytes`)
		return
	}

	// Cap the read too, in case the file grows after stat.
	const chunks: Buffer[] = []
	for await (const chunk of createReadStream(filename, { start: 0, end: MAX_SOURCE_BYTES })) {
		chunks.push(chunk)
	}
	const bytes = Buffer.concat(chunks)
	if (bytes.length > MAX_SOURCE_BYTES) {
		skip(`source exceeds ${MAX_SOURCE_BYTES} bytes`)
		return
	}
	if (bytes.includes(0)) {
		skip('source contains NUL bytes')
		return
	}
	if (!isUtf8(bytes)) {
		skip('source is not valid UTF-8')
		return
	}

	return bytes.toString('utf8')
}
