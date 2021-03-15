import { parseFile, Row } from '@fast-csv/parse'
import { queue, QueueObject } from 'async'

interface Queue<T> {
  row: T
}

async function forEachCsvRow<T>(
  filename: string,
  onRow: (row: T) => Promise<void>,
  onEnd?: (rowCount: number) => Promise<void>,
  maxRows?: number
): Promise<void> {
  function readFinished(rowCount: number, queue: QueueObject<Queue<T>>): void {
    queue.drain(async function () {
      if (onEnd) {
        await onEnd(rowCount)
      }
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
    await onRow(task.row)
    callback()
  }, 1)

  readStream
    .on('error', console.error)
    .on('data', readRow)
    .on('end', (rowCount: number) => readFinished(rowCount, searchQueue))
}

export { forEachCsvRow }
