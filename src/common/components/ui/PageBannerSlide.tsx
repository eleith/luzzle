import { Box, Flex } from '@app/common/components/ui'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'phosphor-react'

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
    <Flex
      css={{ alignItems: 'center', marginRight: '10px', cursor: 'pointer' }}
      onClick={switchTheme}
    >
      <Sun size={25} />
    </Flex>
  )

  const darkOn = (
    <Flex
      css={{ alignItems: 'center', marginRight: '10px', cursor: 'pointer' }}
      onClick={switchTheme}
    >
      <Moon size={25} />
    </Flex>
  )

  const themeToggle = resolvedTheme === 'light' ? darkOn : lightOn

  return (
    <Box
      css={{
        height: '50px',
      }}
    >
      <Flex
        direction={'row'}
        justify={'start'}
        css={{
          position: 'absolute',
          height: '50px',
          top: '0px',
          left: '0px',
          right: '0px',
          paddingLeft: '20px',
          paddingTop: '10px',
          paddingBottom: '10px',
        }}
      >
        <Box>{children && children}</Box>
        <Box css={{ marginLeft: 'auto' }}>{themeToggle}</Box>
      </Flex>
    </Box>
  )
}
