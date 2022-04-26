import { CSS } from '@stitches/react'
import { Box } from '../ui/Box'

function getBookContainerStyles(
  width: number,
  height: number,
  thickness: number,
  perspective: number,
  rotate: number,
  rotateHover: number,
  backgroundColor: string,
  textColor: string,
  shadowColor: string,
  radius: number,
  pagesOffset: number,
  transitionDuration: number,
  backgroundImageUrl?: string
): CSS {
  /* note: css var do not inherit by psueodo elements */
  const bookCssVariables: CSS = {
    '--book-width': `${width}px`,
    '--book-height': `${height}px`,
    '--book-thickness': `${thickness}px`,
    '--book-perspective': `${perspective}px`,
    '--book-rotate': `${rotate}deg`,
    '--book-rotate-hover': `${rotateHover}deg`,
    '--book-color': `${backgroundColor}`,
    '--book-text-color': `${textColor}`,
    '--book-border-radius': `${radius}px`,
    '--book-shadow-color': `${shadowColor}`,
    '--book-page-offset': `${pagesOffset}px`,
    '--book-transition-duration': `${transitionDuration}s`,
    '--book-page-height': 'calc(var(--book-height) - 2 * var(--book-page-offset))',
    '--book-translate': `${width - thickness / 2 - pagesOffset}px`,
    '--book-transform-thickness': `${-thickness / 2}px`,
  }

  const bookContainerStyles: CSS = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    perspective: 'var(--book-perspective)',
    marginBottom: '20px',
  }

  // disable animation on load
  //
  // const bookRotateAnimation = keyframes({
  //   '0%': { transform: `rotateY(${rotateHover}deg)` },
  //   '100%': { transform: `rotateY(${rotate}deg)` },
  // })

  const bookStyles: CSS = {
    width: 'var(--book-width)',
    height: 'var(--book-height)',
    position: 'relative',
    color: 'var(--book-text-color)',
    transformStyle: 'preserve-3d',
    transform: `rotateY(var(--book-rotate))`,
    transition: `transform var(--book-transition-duration) ease`,
    // animation: `1s ease 0s 1 ${bookRotateAnimation}`,
    '&:hover': {
      transform: `rotateY(var(--book-rotate-hover))`,
    },
  }

  const bookChildStyles: CSS = {
    position: 'absolute',
    top: '0',
    left: '0',
    width: 'var(--book-width)',
    height: 'var(--book-height)',
    transform: `translateZ(calc(var(--book-thickness) / 2))`,
    backgroundColor: 'var(--book-color)',
    ...(backgroundImageUrl && { backgroundImage: `url('${backgroundImageUrl}')` }),
    backgroundSize: 'cover',
    borderTopLeftRadius: '0',
    borderTopRightRadius: 'var(--book-border-radius)',
    borderBottomRightRadius: 'var(--book-border-radius)',
    borderBottomLeftRadius: '0',
    boxShadow: `5px 5px 20px var(--book-shadow-color)`,
  }

  const bookBeforeStyles: CSS = {
    position: 'absolute',
    left: 0,
    top: 'var(--book-page-offset)',
    width: 'calc(var(--book-thickness) - 2px)',
    height: 'var(--book-page-height)',
    transform: 'translateX(var(--book-translate)) rotateY(90deg)',
    background: `linear-gradient(90deg, 
        #fff 0%,
        #f9f9f9 5%,
        #fff 10%,
        #f9f9f9 15%,
        #fff 20%,
        #f9f9f9 25%,
        #fff 30%,
        #f9f9f9 35%,
        #fff 40%,
        #f9f9f9 45%,
        #fff 50%,
        #f9f9f9 55%,
        #fff 60%,
        #f9f9f9 65%,
        #fff 70%,
        #f9f9f9 75%,
        #fff 80%,
        #f9f9f9 85%,
        #fff 90%,
        #f9f9f9 95%,
        #fff 100%
        )`,
  }

  const bookAfterStyles: CSS = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 'var(--book-width)',
    height: 'var(--book-height)',
    transform: 'translateZ(var(--book-transform-thickness))',
    backgroundColor: 'var(--book-color)',
    borderTopLeftRadius: '0',
    borderTopRightRadius: 'var(--book-border-radius)',
    borderBottomRightRadius: 'var(--book-border-radius)',
    borderBottomLeftRadius: '0',
    boxShadow: '-10px 0 50px 10px var(--book-shadow-color)',
  }

  return {
    ...bookCssVariables,
    ...bookContainerStyles,
    '& > div:nth-of-type(1)': {
      ...bookStyles,
      '& > div:nth-of-type(1)': {
        ...bookBeforeStyles,
      },
      '& > div:nth-of-type(2)': {
        ...bookChildStyles,
      },
      '& > div:nth-of-type(3)': {
        ...bookAfterStyles,
      },
    },
  }
}

type BookProps = {
  children: JSX.Element
  rotateHover?: number
  rotate?: number
  perspective?: number
  transitionDuration?: number
  radius?: number
  thickness?: number
  backgroundColor?: string
  textColor?: string
  shadowColor?: string
  width?: number
  height?: number
  pagesOffset?: number
  backgroundImageUrl?: string
}

function BookCover({
  children,
  backgroundImageUrl,
  rotateHover = -25,
  rotate = 0,
  perspective = 900,
  transitionDuration = 1,
  thickness = 50,
  backgroundColor = 'black',
  textColor = 'white',
  shadowColor = '#aaaaaa',
  radius = 2,
  width = 200,
  height = 300,
  pagesOffset = 3,
}: BookProps): JSX.Element {
  const coverStyles = getBookContainerStyles(
    width,
    height,
    thickness,
    perspective,
    rotate,
    rotateHover,
    backgroundColor,
    textColor,
    shadowColor,
    radius,
    pagesOffset,
    transitionDuration,
    backgroundImageUrl
  )

  return (
    <Box css={coverStyles}>
      <Box>
        <div />
        <div>{children}</div>
        <div />
      </Box>
    </Box>
  )
}

export default BookCover
