import { parseFile, Row } from '@fast-csv/parse'
import { queue, QueueObject } from 'async'

export interface BookRow {
  title: string
  author: string
  readDate: string
  isbn: string
}

interface BookSearchQueue {
  row: BookRow
}

async function forEachRowIn(
  filename: string,
  onRow: (row: BookRow) => Promise<void>,
  options?: {
    onEnd?: (rowCount: number) => void
    maxRows?: number
  }
): Promise<void> {
  function readFinished(rowCount: number, queue: QueueObject<BookSearchQueue>): void {
    queue.drain(function () {
      console.log(`[csv] parsed all ${rowCount} rows`)
      if (options?.onEnd) {
        options.onEnd(rowCount)
      }
    })
  }

  function readRow(row: BookRow): void {
    searchQueue.push({ row })
  }

  const readStream = parseFile<Row<BookRow>, Row>(filename, {
    headers: true,
    maxRows: options?.maxRows,
  })
  const searchQueue = queue<BookSearchQueue, void>(async (task, callback) => {
    await onRow(task.row)
    callback()
  }, 1)

  readStream
    .on('error', (error) => console.error(error))
    .on('data', readRow)
    .on('end', (rowCount: number) => readFinished(rowCount, searchQueue))
}

export { forEachRowIn }
