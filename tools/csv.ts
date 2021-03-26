import { parseFile, Row } from '@fast-csv/parse'
import { CsvFormatterStream, format } from '@fast-csv/format'
import { queue, QueueObject } from 'async'
import { createWriteStream } from 'fs'

interface Queue<T> {
  row: T
}

function initializeCsv<T>(filename: string): CsvFormatterStream<T, T> {
  const writeStream = format({ headers: true })
  writeStream.pipe(createWriteStream(filename))

  // writeStream.write(row: T)
  // writeStream.end()

  return writeStream
}

async function forEachCsvRow<T>(
  filename: string,
  onRow: (row: T) => Promise<void>,
  maxRows?: number
): Promise<number> {
  return new Promise((resolve, reject) => {
    function readFinished(rowCount: number, queue: QueueObject<Queue<T>>): void {
      queue.drain(async function () {
        resolve(rowCount)
      })
    }

    function readRow(row: T): void {
      searchQueue.push({ row })
    }

    const readStream = parseFile<Row<T>, Row>(filename, {
      headers: true,
      maxRows: maxRows,
    })

    const searchQueue = queue<Queue<T>, void>(async (task, callback) => {
      try {
        await onRow(task.row)
      } catch (e) {
        reject(e)
      }
      callback()
    }, 1)

    readStream
      .on('error', console.error)
      .on('data', readRow)
      .on('end', (rowCount: number) => readFinished(rowCount, searchQueue))
  })
}

export { forEachCsvRow, initializeCsv }
