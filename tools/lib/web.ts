import { createWriteStream } from 'fs'
import got from 'got'
import { fromStream } from 'file-type'
// import tempy from 'tempy'

async function downloadTo(url: string): Promise<string> {
  const { default: tempy } = await import('tempy')

  const response = got.stream(url)
  const fileType = await fromStream(response)
  const filePath = tempy.file({ extension: fileType?.ext })
  const writer = createWriteStream(filePath)

  response.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath))
    writer.on('error', reject)
    response.on('error', reject)
  })
}

export { downloadTo }
