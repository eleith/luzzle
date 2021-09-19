import { ThemeUIStyleObject } from 'theme-ui'
import { Image, Box } from 'theme-ui'

export function getCoverPath(id: string): string {
  const folder1 = id.substr(-2)
  const folder2 = id.substr(-4, 2)
  return `/images/covers/${folder1}/${folder2}/${id}.jpg`
}

const BookSizes = {
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
  EXTRA_LARGE: 4,
} as const

type BookSize = typeof BookSizes[keyof typeof BookSizes]

export function getBookStyle(size: BookSize): ThemeUIStyleObject {
  return {
    width: `${size * 10 + 170}px`,
    height: `${((size * 10 + 170) * 3) / 2}px`,
    marginLeft: '25px',
    marginRight: '25px',
    background: '#FFF',
    borderLeft: `${size * 5 + 5}px solid #303030`,
    transform: 'rotate(-15deg) skewX(10deg) scale(.8)',
    boxShadow: '-50px 50px 50px rgba(0, 0, 0, 0.5)',
    opacity: '55%',
    '::before': {
      content: '""',
      width: `${size * 5 + 5}px`,
      height: '100%',
      background: '#000000',
      position: 'absolute',
      top: '0',
      left: '0',
      transform: `skewY(-45deg) translate(-${size * 10 + 10}px, -${size * 8 + 7}px)`,
    },
    '::after': {
      content: '""',
      width: '196px',
      height: `${size * 5 + 5}px`,
      background: '#CCC',
      position: 'absolute',
      bottom: '0',
      left: '0',
      transform: `skewX(-45deg) translate(-${size * 2 + 3}px, ${size * 5 + 5}px)`,
    },
  }
}

export function getBookSize(pages: number): BookSize {
  if (pages) {
    if (pages > 900) {
      return BookSizes.MEDIUM
    } else if (pages > 600) {
      return BookSizes.LARGE
    } else if (pages > 300) {
      return BookSizes.EXTRA_LARGE
    }
  }
  return BookSizes.SMALL
}

export function makeBook(size: BookSize, coverUrl?: string): JSX.Element {
  const coverImage = coverUrl && (
    <Image
      alt="book cover art for x"
      src={coverUrl}
      sx={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'left top',
      }}
    />
  )
  const bookStyle = getBookStyle(size)
  return <Box sx={bookStyle}>{coverImage}</Box>
}
