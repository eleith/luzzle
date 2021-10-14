import { createWriteStream, mkdirSync } from 'fs'
import { dirname } from 'path'
import got from 'got'

async function downloadImage(url: string, outputPath: string): Promise<void> {
  const basepath = dirname(outputPath)

  mkdirSync(basepath, { recursive: true })

  const writer = createWriteStream(outputPath)
  const response = got.stream(url)

  response.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

export { downloadImage }
