import * as React from 'react'

// evolved from
// https://github.com/anthonyshort/react-notification-provider/blob/master/src/index.tsx

type WithId = { id: string }
type OptionalId = { id?: string }

type QueuedItem<T extends WithId> = T
type QueuedOptionalItem<T> = Omit<T, 'id'> & OptionalId

interface ImmutableQueue<T extends WithId> {
  add: (item: QueuedOptionalItem<T>) => ImmutableQueue<T>
  remove: (id: string) => ImmutableQueue<T>
  removeAll: () => ImmutableQueue<T>
  entries: QueuedItem<T>[]
}

export interface QueueProviderProps<T extends WithId> {
  queue?: ImmutableQueue<T>
  children: React.ReactNode
}

export interface QueueHook<T extends WithId> {
  add: (item: QueuedOptionalItem<T>) => void
  remove: (id: string) => void
  removeAll: () => void
  entries: QueuedItem<T>[]
}

export function useQueue<T extends WithId>(initialValue: ImmutableQueue<T>): QueueHook<T> {
  const [{ entries }, setQueue] = React.useState(initialValue)

  const add = React.useCallback(
    (item: QueuedOptionalItem<T>): void => {
      setQueue((queue) => queue.add(item))
    },
    [setQueue]
  )

  const remove = React.useCallback(
    (id: string): void => {
      setQueue((queue) => queue.remove(id))
    },
    [setQueue]
  )

  const removeAll = React.useCallback((): void => {
    setQueue((queue) => queue.removeAll())
  }, [setQueue])

  return React.useMemo(
    () => ({
      add,
      remove,
      removeAll,
      entries,
    }),
    [add, remove, removeAll, entries]
  )
}

export function createImmutableQueue<T extends WithId>(
  entries: QueuedItem<T>[] = []
): ImmutableQueue<T> {
  return {
    add(_item: QueuedOptionalItem<T>): ImmutableQueue<T> {
      const item = {
        id: _item.id || new Date().getTime().toString(),
        ..._item,
      } as T
      const matchIndex = entries.findIndex((n) => {
        return n.id === item.id
      })
      const copy = entries.slice()
      if (matchIndex > -1) {
        copy.splice(matchIndex, 1, item)
      } else {
        copy.push(item)
      }
      return createImmutableQueue(copy)
    },
    remove(id: string): ImmutableQueue<T> {
      return createImmutableQueue(entries.filter((n) => n.id !== id))
    },
    removeAll(): ImmutableQueue<T> {
      return createImmutableQueue()
    },
    entries,
  }
}

export function createContextQueue<T extends WithId>() {
  const QueueContext = React.createContext<QueueHook<T> | null>(null)

  function useQueueContext(): QueueHook<T> {
    const queue = React.useContext(QueueContext)
    if (!queue) {
      throw new Error('Missing <QueueProvider>')
    }
    return queue
  }

  function QueueProvider(props: QueueProviderProps<T>): JSX.Element {
    const { children, queue: initialQueue } = props
    const queue = useQueue<T>(initialQueue ? initialQueue : createImmutableQueue())
    return <QueueContext.Provider value={queue}>{children}</QueueContext.Provider>
  }

  function createQueue() {
    return createImmutableQueue<T>()
  }

  return {
    QueueContext,
    QueueProvider,
    useQueueContext,
    createQueue,
  }
}
