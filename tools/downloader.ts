import { createWriteStream, mkdirSync } from 'fs'
import axios from 'axios'
import { dirname } from 'path'

async function downloadImage(url: string, outputPath: string): Promise<void> {
  const basepath = dirname(outputPath)

  mkdirSync(basepath, { recursive: true })

  const writer = createWriteStream(outputPath)
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

export { downloadImage }
