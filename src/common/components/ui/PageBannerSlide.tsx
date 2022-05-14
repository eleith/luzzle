import { Box } from '@app/common/components/ui/Box'
import { Flex } from '../ui/Flex'
import { useState } from 'react'
import { keyframes } from '@app/lib/ui/stitches.config'
// import debounce from 'lodash/debounce'

interface PageProps {
  children?: React.ReactNode
}

export default function PageMarkdown(props: PageProps): JSX.Element {
  const { children } = props
  const [showControls] = useState<boolean | null>(null)

  const slide = keyframes({
    '0%': { marginTop: showControls ? '-50px' : '0px' },
    '100%': { marginTop: showControls ? '0px' : '-50px' },
  })

  // const debounced = debounce(() => setShowControls(false), 250)

  return (
    <Box
      css={{
        height: '50px',
      }}
      // onMouseEnter={() => {
      //   debounced.cancel()
      //   setShowControls(true)
      // }}
      // onMouseLeave={debounced}
      // onTouchEnd={() => {
      //   setShowControls(true)
      // }}
    >
      <Flex
        justify={'start'}
        css={{
          background: 'orange',
          position: 'absolute',
          height: '50px',
          top: '0px',
          left: '0px',
          right: '0px',
          paddingLeft: '20px',
          paddingTop: '10px',
          paddingBottom: '10px',
          marginTop: showControls ? '0px' : '-45px',
          animationDuration: '300ms',
          animationTimingFunction: 'ease-in-out',
          animationName: showControls !== null ? `${slide}` : 'none',
        }}
      >
        {children && children}
      </Flex>
    </Box>
  )
}
