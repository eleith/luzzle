import * as React from 'react'
import * as styles from './styles.css'
import clsx from 'clsx'
import { Box } from '../Box'
import { Portal } from 'ariakit'
import { createContextQueue, QueueHook, QueueProviderProps } from './contextQueue'
import { Button } from '../Button'

type NotificationProps = {
  children?: React.ReactNode
  duration?: number
  id: string
  action?: string
  onAction?: () => void
  level?: 'polite' | 'assertive'
} & styles.NotificationVariants

type NotificationItem = Omit<NotificationProps, 'children'> & { item: React.ReactNode }

const { useQueueContext, QueueProvider } = createContextQueue<NotificationItem>()

export const Notification = function ({
  children,
  id,
  duration = 4000,
  className,
  action = 'dismiss',
  onAction,
  level = 'polite',
  ...props
}: NotificationProps & React.HTMLAttributes<HTMLDivElement>) {
  const notifications = useQueueContext()
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        notifications.remove(id)
      }
    }

    document.addEventListener('keydown', onEscape)

    const timeout = setTimeout(() => {
      notifications.remove(id)
    }, duration)

    return (): void => {
      if (timeout) {
        clearTimeout(timeout)
      }
      document.removeEventListener('keydown', onEscape)
    }
  }, [id, duration, notifications])

  function takeAction() {
    notifications.remove(id)
    onAction?.()
  }

  const variantClass = styles.variants({})
  const actionButton = action && <Button onClick={takeAction}>{action}</Button>

  return (
    <Box
      ref={ref}
      className={clsx(className, variantClass) || undefined}
      {...props}
      aria-live={level}
    >
      {children}
      {actionButton}
    </Box>
  )
}

export const NotificationList = function () {
  const queue = useQueueContext()
  const entry = queue.entries?.[0]
  const { id, item, ...props } = entry || {}

  React.useEffect(() => {
    if (queue.entries.length) {
      toggleBlockers(true)
    } else {
      toggleBlockers(false)
    }
  })

  function toggleBlockers(hide: boolean) {
    const bottom = document.querySelectorAll<HTMLElement>('[data-bottom-area]')
    bottom.forEach((element) => {
      element.style.visibility = hide ? 'hidden' : 'visible'
    })
  }

  return (
    <Portal>
      {entry && (
        <Notification key={id} id={id} {...props}>
          {item}
        </Notification>
      )}
    </Portal>
  )
}

export const useNotificationQueue: () => QueueHook<NotificationItem> = useQueueContext
export const NotificationProvider: (props: QueueProviderProps<NotificationItem>) => JSX.Element =
  QueueProvider

Notification.displayName = 'Notification'
NotificationList.displayName = 'NotificationList'
