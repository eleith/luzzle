import { createWriteStream } from 'fs'
import got from 'got'
import tempy from 'tempy'

async function downloadTo(url: string): Promise<string> {
  const response = got.stream(url)
  const filePath = tempy.file()
  const writer = createWriteStream(filePath)

  response.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath))
    writer.on('error', reject)
    response.on('error', reject)
  })
}

export { downloadTo }
