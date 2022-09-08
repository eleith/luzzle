import { Anchor, Box } from '@app/common/ui/components'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, HandWaving } from 'phosphor-react'
import * as classNames from './PageBannerSlide.css'
import Link from 'next/link'

interface PageProps {
  children?: React.ReactNode
  isHome?: boolean
}

export default function PageMarkdown({ children, isHome = false }: PageProps): JSX.Element {
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

  const homeButton = (
    <Link href="/" passHref>
      <Anchor color="inherit" style={{ visibility: isHome ? 'hidden' : 'visible' }}>
        <HandWaving size={25} />
      </Anchor>
    </Link>
  )

  const themeToggle = resolvedTheme === 'light' ? darkOn : lightOn

  return (
    <Box>
      <Box className={classNames.banner}>
        <Box className={classNames.navItem}>{homeButton}</Box>
        <Box>{children && children}</Box>
        <Box className={classNames.navItem}>{themeToggle}</Box>
      </Box>
    </Box>
  )
}
