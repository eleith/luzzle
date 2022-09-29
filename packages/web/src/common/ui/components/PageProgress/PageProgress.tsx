// evolved from https://raw.githubusercontent.com/klendi/react-top-loading-bar

import clsx from 'clsx'
import * as React from 'react'
import { vars } from '../../css'
import { Box } from '../Box'
import * as styles from './styles.css'

type PageProgressStateProps = {
  progress?: number
  duration?: number
  interval?: number
  imitate?: boolean
}

type PageProgressState = {
  loading: boolean
  progress: number
  setProgress: (progress: number) => void
  duration: number
}

type Props = {
  progress?: number
  color?: string
  height?: number
  active?: boolean
  transitionDuration?: number
  interval?: number
  state: PageProgressState
} & React.HTMLAttributes<HTMLDivElement>

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export const useProgressPageState = function (props: PageProgressStateProps = {}) {
  const { progress = 1, imitate = false, interval = 750, duration = 350 } = props
  const [{ progress: localProgress, loading: localLoading }, setLocalProgressState] =
    React.useState({
      progress: progress,
      loading: progress > 0,
    })

  React.useEffect(() => {
    const max = 98
    const loading = imitate && localProgress > 0 && localProgress < max
    let timeout: number | undefined
    let timer: number | undefined

    if (loading) {
      timer = window.setInterval(() => {
        const random = randomInt(1, 9)
        const nextProgress = localProgress + random

        if (nextProgress > max) {
          setLocalProgressState({ progress: max, loading: true })
          clearInterval(timer)
        } else {
          setLocalProgressState({ progress: nextProgress, loading: true })
        }
      }, interval)
    } else if (localProgress >= 100) {
      setLocalProgressState({ progress: 100, loading: true })
      timeout = window.setTimeout(() => {
        setLocalProgressState({ progress: 0, loading: false })
      }, duration)
    }

    return () => {
      clearInterval(timer)
      clearTimeout(timeout)
    }
  }, [imitate, localProgress, setLocalProgressState, interval, duration])

  return {
    loading: localLoading,
    progress: localProgress,
    duration: duration,
    setProgress: (progress: number) => {
      setLocalProgressState({ progress, loading: progress > 0 })
    },
  }
}

export const PageProgress = React.forwardRef<HTMLDivElement, Props>(
  ({ height = 2, color = vars.colors.primary, state, className, ...props }, ref) => {
    const variantClass = styles.variants({})

    return (
      <Box
        ref={ref}
        className={clsx(className, variantClass, styles.container) || undefined}
        style={{ height: `${height}px` }}
        {...props}
      >
        <Box
          className={styles.loader}
          style={{
            width: `${state.progress}%`,
            backgroundColor: color,
            transitionDuration: `${state.duration}ms`,
          }}
        />
      </Box>
    )
  }
)

PageProgress.displayName = 'PageProgress'
