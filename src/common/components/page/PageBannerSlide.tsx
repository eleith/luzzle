import { Box } from '@app/common/ui/components'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'phosphor-react'
import * as classNames from './PageBannerSlide.css'

interface PageProps {
  children?: React.ReactNode
}

export default function PageMarkdown(props: PageProps): JSX.Element {
  const { children } = props
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <></>
  }

  function switchTheme(): void {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }

  const lightOn = (
    <Box onClick={switchTheme}>
      <Sun size={25} />
    </Box>
  )

  const darkOn = (
    <Box onClick={switchTheme}>
      <Moon size={25} />
    </Box>
  )

  const themeToggle = resolvedTheme === 'light' ? darkOn : lightOn

  return (
    <Box>
      <Box className={classNames.banner}>
        <Box>{children && children}</Box>
        <Box className={classNames.themeButton}>{themeToggle}</Box>
      </Box>
    </Box>
  )
}
