import { keyframes } from '@app/lib/ui/stitches.config'
import { CSS } from '@stitches/react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Box } from '../ui/Box'

function getBookContainerStyles(
  width: number,
  height: number,
  thickness: number,
  perspective: number,
  rotate: { x: number; y: number },
  backgroundColor: string,
  textColor: string,
  shadowColor: string,
  radius: number,
  pagesOffset: number,
  transitionDuration: number,
  isMoving: boolean
): {
  container: CSS
  book: CSS
  bookInner: CSS
  bookCover: CSS
  bookCoverLoading: CSS
  bookSpine: CSS
  bookPages: CSS
  bookPagesBottom: CSS
  bookPagesTop: CSS
  bookBack: CSS
  bookShadow: CSS
} {
  const rotated = rotate.x || rotate.y || isMoving

  /* note: css var do not inherit by psueodo elements */
  const bookCssVariables: CSS = {
    '--book-width': `${width}px`,
    '--book-height': `${height}px`,
    '--book-thickness': `${thickness}px`,
    '--book-text-color': `${textColor}`,
    '--book-border-radius': `${radius}px`,
    '--book-shadow-color': `${shadowColor}`,
    '--book-page-offset': `${pagesOffset}px`,
    '--book-transition-duration': `${transitionDuration}s`,
    '--book-page-height': 'calc(var(--book-height) - 2 * var(--book-page-offset))',
    '--book-translate': `${width - thickness / 2 - pagesOffset}px`,
    '--book-transform-thickness': `${-thickness}px`,
  }

  const bookContainerStyles: CSS = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  if (rotated) {
    bookContainerStyles.perspective = `${perspective}px`
  }

  const pulse = keyframes({
    '0%': { backgroundColor: '#494949' },
    '100%': { backgroundColor },
  })

  const pulseAnimation: CSS = {
    animationName: `${pulse}`,
    animationDuration: '500ms',
    animationDirection: 'alternate',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  }

  const bookStyles: CSS = {
    width: 'var(--book-width)',
    height: 'var(--book-height)',
    position: 'relative',
    color: 'var(--book-text-color)',
  }

  if (rotated) {
    bookStyles.transformStyle = 'preserve-3d'
    bookStyles.transition = `transform var(--book-transition-duration) ease`
    bookStyles.transform = `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`
  }

  const bookInnerStyles: CSS = {
    position: 'absolute',
    top: '0',
    left: '0',
    width: 'var(--book-width)',
    height: 'var(--book-height)',
    borderTopLeftRadius: '0',
    borderTopRightRadius: 'var(--book-border-radius)',
    borderBottomRightRadius: 'var(--book-border-radius)',
    borderBottomLeftRadius: '0',
    boxShadow: `5px 5px 20px var(--book-shadow-color)`,
  }

  const bookPagesStyles: CSS = {
    display: rotated ? 'block' : 'none',
    position: 'absolute',
    left: 0,
    top: 'var(--book-page-offset)',
    width: 'calc(var(--book-thickness) - 2px)',
    height: 'var(--book-page-height)',
    transform:
      'translateX(var(--book-translate)) translateZ(calc(0px - var(--book-thickness) / 2)) rotateY(90deg)',
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

  const bookPagesBottomStyles: CSS = {
    display: rotated ? 'block' : 'none',
    position: 'absolute',
    left: 1,
    bottom: 0,
    width: 'calc(var(--book-width) - 4px)',
    height: 'var(--book-thickness)',
    transform: `translateY(${
      thickness / 2 - 5
    }px) translateZ(calc(0px - var(--book-thickness) / 2)) rotateX(270deg)`,
    background: `linear-gradient(0deg,
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

  const bookPagesTopStyles: CSS = {
    display: rotated ? 'block' : 'none',
    position: 'absolute',
    right: 1,
    top: 0,
    width: 'calc(var(--book-width) - 4px)',
    height: 'var(--book-thickness)',
    transform: `translateY(-${
      thickness / 2 - 5
    }px) translateZ(calc(0px - var(--book-thickness) / 2)) rotateX(270deg)`,
    background: `linear-gradient(0deg,
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

  const bookSpineStyles: CSS = {
    display: rotated ? 'block' : 'none',
    position: 'absolute',
    left: 0,
    top: 0,
    width: 'calc(var(--book-thickness) - 2px)',
    height: 'var(--book-height)',
    transform: `translateX(-${
      thickness / 2 - 2
    }px) translateZ(calc(0px - var(--book-thickness) / 2)) rotateY(-90deg)`,
    backgroundColor,
  }

  const bookBackStyles: CSS = {
    display: rotated ? 'block' : 'none',
    position: 'absolute',
    top: 0,
    left: 0,
    width: 'var(--book-width)',
    height: 'var(--book-height)',
    transform: 'translateZ(var(--book-transform-thickness))',
    backgroundColor,
    borderTopLeftRadius: '0',
    borderTopRightRadius: 'var(--book-border-radius)',
    borderBottomRightRadius: 'var(--book-border-radius)',
    borderBottomLeftRadius: '0',
  }

  const bookShadowStyles: CSS = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 'var(--book-width)',
    height: 'var(--book-height)',
    borderTopLeftRadius: '0',
    borderTopRightRadius: 'var(--book-border-radius)',
    borderBottomRightRadius: 'var(--book-border-radius)',
    borderBottomLeftRadius: '0',
    boxShadow: '-10px 0 50px 0px var(--book-shadow-color)',
  }

  if (rotated) {
    bookShadowStyles.boxShadow = '-10px 0 50px 10px var(--book-shadow-color)'
    bookShadowStyles.transform = 'translateZ(var(--book-transform-thickness))'
  }

  const bookCoverStyles: CSS = {
    position: 'absolute',
    top: '0px',
    left: '0px',
    bottom: '0px',
    right: '0px',
    backgroundColor,
  }

  const bookCoverLoadingStyles: CSS = {
    ...pulseAnimation,
  }

  return {
    container: {
      ...bookCssVariables,
      ...bookContainerStyles,
    },
    book: {
      ...bookStyles,
    },
    bookPages: {
      ...bookPagesStyles,
    },
    bookPagesBottom: {
      ...bookPagesBottomStyles,
    },
    bookPagesTop: {
      ...bookPagesTopStyles,
    },
    bookBack: {
      ...bookBackStyles,
    },
    bookShadow: {
      ...bookShadowStyles,
    },
    bookSpine: {
      ...bookSpineStyles,
    },
    bookInner: {
      ...bookInnerStyles,
    },
    bookCover: {
      ...bookCoverStyles,
    },
    bookCoverLoading: {
      ...bookCoverStyles,
      ...bookCoverLoadingStyles,
    },
  }
}

export type BookCoverProps = {
  children: JSX.Element
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
  loading?: boolean
  rotate?: { x: number; y: number }
  rotateInteract?: { x: number; y: number }
}

function BookCover({
  children,
  backgroundImageUrl,
  rotate = { x: 0, y: 0 },
  rotateInteract = rotate,
  perspective = 900,
  transitionDuration = 0.75,
  thickness = 50,
  backgroundColor = 'black',
  textColor = 'white',
  shadowColor = '#aaaaaa',
  radius = 2,
  width = 200,
  height = 300,
  pagesOffset = 3,
  loading = false,
}: BookCoverProps): JSX.Element {
  const hasBackgroundImage = !!backgroundImageUrl
  const [isLoading, setLoading] = useState(hasBackgroundImage || loading)
  const [isMoving, setMoving] = useState(false)
  const [rotateTo, setRotate] = useState(rotate)

  useEffect(() => {
    setMoving(true)
    setRotate(rotate)
  }, [rotate])

  useEffect(() => {
    setLoading(loading)
  }, [loading])

  const styles = getBookContainerStyles(
    width,
    height,
    thickness,
    perspective,
    rotateTo,
    backgroundColor,
    textColor,
    shadowColor,
    radius,
    pagesOffset,
    transitionDuration,
    isMoving
  )

  const coverImage = (
    <Box css={isLoading ? styles.bookCoverLoading : styles.bookCover}>
      {hasBackgroundImage && (
        <Image
          loader={({ src }) => src}
          unoptimized
          src={backgroundImageUrl}
          width={width}
          height={height}
          alt="" // decorative
          objectFit="fill"
          onError={() => {
            setLoading(false)
          }}
          onLoadingComplete={() => {
            setLoading(false)
          }}
        />
      )}
    </Box>
  )

  function stop(): void {
    if (rotate.x != rotateInteract.x || rotate.y != rotateInteract.y) {
      setMoving(true)
      setRotate(rotate)
    }
  }

  function start(): void {
    if (rotate.x != rotateInteract.x || rotate.y != rotateInteract.y) {
      setMoving(true)
      setRotate(rotateInteract)
    }
  }

  function end(): void {
    setMoving(false)
  }

  return (
    <Box
      css={styles.container}
      onMouseOver={start}
      onMouseLeave={stop}
      onTransitionEnd={end}
      onTouchStart={start}
      onTouchEnd={stop}
    >
      <Box css={styles.book}>
        <Box css={styles.bookShadow} />
        <Box css={styles.bookSpine} />
        <Box css={styles.bookPages} />
        <Box css={styles.bookPagesBottom} />
        <Box css={styles.bookPagesTop} />
        <Box css={styles.bookBack} />
        <Box css={styles.bookInner}>
          {children}
          {coverImage}
        </Box>
      </Box>
    </Box>
  )
}

export default BookCover
