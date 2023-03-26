import config from '@app/common/config'
import Link from 'next/link'
import BookCover, { BookCoverProps } from './BookCover'
import { VisuallyHidden } from 'ariakit'
import { createHash } from 'crypto'
import { Box, Text } from '@luzzle/ui/components'

const BookCoverSize = {
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  LARGE: 'LARGE',
} as const

type Book = {
  slug: string
  title: string
  id: string
  pages?: number | null
}

type BookCoverForProps = {
  asLink?: boolean
  book: Book
  hasCover?: boolean
  size?: typeof BookCoverSize
  scale?: number
} & Omit<BookCoverProps, 'children' | 'backgroundImageUrl'>

const BookColors = ['#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#fe8019']

const sizes = {
  SMALL: {
    width: 200 * 0.9,
    height: 300 * 0.9,
    thickness: 50 * 0.9,
  },
  MEDIUM: {
    width: 200,
    height: 300,
    thickness: 50,
  },
  LARGE: {
    width: 200 * 1.1,
    height: 300 * 1.1,
    thickness: 50 * 1.1,
  },
}

function getColor(slug: string): typeof BookColors[number] {
  const numColors = BookColors.length
  const hex = createHash('sha256').update(slug).digest('hex')
  const random = parseInt(hex, 16) % numColors

  return BookColors[random]
}

function getSize(pages?: number | null, scale = 1): typeof sizes[keyof typeof BookCoverSize] {
  let size = sizes.SMALL
  if (pages) {
    if (pages >= 700) {
      size = sizes.LARGE
    } else if (pages && pages >= 320) {
      size = sizes.MEDIUM
    }
  }
  return {
    width: size.width * scale,
    height: size.height * scale,
    thickness: size.thickness * scale,
  }
}

function BookCoverFor({
  book,
  asLink = false,
  hasCover = false,
  scale = 1,
  ...coverProps
}: BookCoverForProps): JSX.Element {
  const coverUrl = `${config.public.HOST_STATIC}/images/covers/${book.slug}.jpg`
  const size = getSize(book.pages, scale)
  const color = getColor(book.slug)
  const bookCoverProps = {
    ...size,
    backgroundColor: color,
    ...coverProps,
    backgroundImageUrl: hasCover ? coverUrl : undefined,
  } as BookCoverProps

  if (asLink) {
    return (
      <Link href={`/books/${book.slug}`}>
        <a>
          <BookCover {...bookCoverProps}>
            <Box>
              <Text size="label">{book.title}</Text>
              <VisuallyHidden>{book.title}</VisuallyHidden>
            </Box>
          </BookCover>
        </a>
      </Link>
    )
  } else {
    return (
      <BookCover {...bookCoverProps}>
        <Box>
          <Text size="label">{book.title}</Text>
          <VisuallyHidden>{book.title}</VisuallyHidden>
        </Box>
      </BookCover>
    )
  }
}

export default BookCoverFor
