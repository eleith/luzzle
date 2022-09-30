import { createWriteStream } from 'fs'
import got from 'got'
import { temporaryFile } from 'tempy'

async function downloadTo(url: string): Promise<string> {
  const response = got.stream(url)
  const filePath = temporaryFile()
  const writer = createWriteStream(filePath)

  response.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath))
    writer.on('error', reject)
    response.on('error', reject)
  })
}

export { downloadTo }
