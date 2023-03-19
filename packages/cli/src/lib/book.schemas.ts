import { Book } from './prisma'
import { JTDSchemaType } from 'ajv/dist/jtd'
import Ajv from 'ajv/dist/jtd'

export type BookDatabaseCache = ToJsonCompatible<
  Pick<Book, NonNullableKeys<Book>> & Partial<UnNullify<Pick<Book, NullableKeys<Book>>>>
>

export type BookDatabaseOnlyFields =
  | 'id'
  | 'date_added'
  | 'date_updated'
  | 'slug'
  | 'read_order'
  | 'note'
  | 'cover_width'
  | 'cover_height'

export type BookMd = {
  filename: string
  markdown?: string
  frontmatter: Omit<
    Pick<Book, NonNullableKeys<Book>> & Partial<UnNullify<Pick<Book, NullableKeys<Book>>>>,
    BookDatabaseOnlyFields
  >
}

export type BookMdWithOpenLib = BookMd & { frontmatter: { id_ol_book: string } }

const bookMdSchema: JTDSchemaType<BookMd> = {
  properties: {
    filename: { type: 'string' },
    frontmatter: {
      properties: {
        title: { type: 'string' },
        author: { type: 'string' },
      },
      optionalProperties: {
        id_ol_book: { type: 'string' },
        id_ol_work: { type: 'string' },
        isbn: { type: 'string' },
        subtitle: { type: 'string' },
        coauthors: { type: 'string' },
        description: { type: 'string' },
        pages: { type: 'uint32' },
        year_read: { type: 'uint32' },
        month_read: { type: 'uint32' },
        year_first_published: { type: 'uint32' },
        keywords: { type: 'string' },
        cover_path: { type: 'string' },
      },
    },
  },
  optionalProperties: {
    markdown: { type: 'string' },
  },
}

const cacheDatabaseSchema: JTDSchemaType<BookDatabaseCache> = {
  properties: {
    id: { type: 'string' },
    date_added: { type: 'timestamp' },
    date_updated: { type: 'timestamp' },
    slug: { type: 'string' },
    title: { type: 'string' },
    author: { type: 'string' },
    read_order: { type: 'string' },
  },
  optionalProperties: {
    cover_width: { type: 'uint32' },
    cover_height: { type: 'uint32' },
    id_ol_book: { type: 'string' },
    id_ol_work: { type: 'string' },
    isbn: { type: 'string' },
    subtitle: { type: 'string' },
    coauthors: { type: 'string' },
    description: { type: 'string' },
    pages: { type: 'uint32' },
    year_read: { type: 'uint32' },
    month_read: { type: 'uint32' },
    year_first_published: { type: 'uint32' },
    keywords: { type: 'string' },
    cover_path: { type: 'string' },
    note: { type: 'string' },
  },
}

const bookMdValidator = new Ajv().compile(bookMdSchema)

export { bookMdSchema, cacheDatabaseSchema, bookMdValidator }
