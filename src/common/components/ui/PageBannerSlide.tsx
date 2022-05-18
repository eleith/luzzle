import { Box, Text, Flex } from '@app/common/components/ui'
import { useEffect, useState } from 'react'
import { keyframes } from '@app/lib/ui/stitches.config'
import debounce from 'lodash/debounce'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'phosphor-react'

interface PageProps {
  children?: React.ReactNode
}

export default function PageMarkdown(props: PageProps): JSX.Element {
  const { children } = props
  const [showControls, setShowControls] = useState<boolean | null>(null)
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <></>
  }

  const slide = keyframes({
    '0%': { marginTop: showControls ? '-45px' : '0px' },
    '100%': { marginTop: showControls ? '0px' : '-45px' },
  })

  const debounced = debounce(() => setShowControls(false), 350)

  function switchTheme(): void {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }

  const lightOn = (
    <Flex
      css={{ alignItems: 'center', marginRight: '10px', cursor: 'pointer' }}
      onClick={switchTheme}
    >
      <Text css={{ marginRight: '10px' }}>light</Text>
      <Sun size={35} />
    </Flex>
  )

  const darkOn = (
    <Flex
      css={{ alignItems: 'center', marginRight: '10px', cursor: 'pointer' }}
      onClick={switchTheme}
    >
      <Text css={{ marginRight: '10px' }}>dark</Text>
      <Moon size={35} />
    </Flex>
  )

  const themeToggle = resolvedTheme === 'light' ? darkOn : lightOn

  return (
    <Box
      css={{
        height: '50px',
      }}
      onMouseEnter={() => {
        debounced.cancel()
        setShowControls(true)
      }}
      onMouseLeave={debounced}
      onTouchStart={() => {
        setShowControls(true)
      }}
      onTouchMove={() => {
        setShowControls(false)
      }}
    >
      <Flex
        direction={'row'}
        justify={'start'}
        css={{
          background: '$colors$primary',
          color: '$colors$primaryText',
          position: 'absolute',
          height: '50px',
          top: '0px',
          left: '0px',
          right: '0px',
          paddingLeft: '20px',
          paddingTop: '10px',
          paddingBottom: '10px',
          marginTop: showControls ? '0px' : '-45px',
          animationDuration: '250ms',
          animationTimingFunction: 'ease-out',
          animationName: showControls !== null ? `${slide}` : 'none',
        }}
      >
        <Box>{children && children}</Box>
        <Box css={{ marginLeft: 'auto' }}>{themeToggle}</Box>
      </Flex>
    </Box>
  )
}
