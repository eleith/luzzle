import config from '@app/common/config'
import Link from 'next/link'
import BookCover, { BookCoverProps } from './BookCover'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

type Book = {
  slug: string
  title: string
  id: string
}

type BookCoverForProps = {
  asLink?: boolean
  book: Book
  hasCover?: boolean
} & Omit<BookCoverProps, 'children' | 'backgroundImageUrl'>

function BookCoverFor({
  book,
  asLink = false,
  hasCover = false,
  ...coverProps
}: BookCoverForProps): JSX.Element {
  const coverUrl = `${config.HOST_STATIC}/images/covers/${book.slug}.jpg`

  if (asLink) {
    return (
      <Link href={`/books/${book.slug}`} key={book.id}>
        <a>
          <BookCover {...coverProps} backgroundImageUrl={hasCover ? coverUrl : undefined}>
            <VisuallyHidden>{book.title}</VisuallyHidden>
          </BookCover>
        </a>
      </Link>
    )
  } else {
    return (
      <BookCover {...coverProps} backgroundImageUrl={hasCover ? coverUrl : undefined}>
        <VisuallyHidden>{book.title}</VisuallyHidden>
      </BookCover>
    )
  }
}

export default BookCoverFor
