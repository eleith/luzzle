import type { ColumnType, Insertable, Updateable, Selectable, Kysely } from 'kysely'

type cuid = string
type date_added = ColumnType<number, undefined, never>
type date_updated = ColumnType<number | null, undefined, number>

export interface BooksTable {
  id: cuid
  id_ol_book: string | null
  id_ol_work: string | null
  isbn: string | null
  title: string
  subtitle: string | null
  author: string
  coauthors: string | null
  description: string | null
  pages: number | null
  year_read: number | null
  month_read: number | null
  year_first_published: number | null
  date_added: date_added
  date_updated: date_updated
  keywords: string | null
  cover_width: number | null
  cover_height: number | null
  cover_path: string | null
  slug: string
  note: string | null
  read_order: string
}

export interface TagMapsTable {
  id_tag: cuid
  id_item: cuid
  type: 'books'
  date_added: date_added
  date_updated: date_updated
}

export interface TagsTable {
  id: cuid
  slug: string
  name: string
  date_added: date_added
  date_updated: date_updated
}

export interface Database {
  books: BooksTable
  tag_maps: TagMapsTable
  tags: TagsTable
}

export type LuzzleDatabase = Kysely<Database>

export type Book = Selectable<BooksTable>
export type BookInsert = Insertable<BooksTable>
export type BookUpdate = Updateable<BooksTable>

export type Tag = Selectable<TagsTable>
export type TagInsert = Insertable<TagsTable>
export type TagUpdate = Updateable<TagsTable>

export type TagMap = Selectable<TagMapsTable>
export type TagMapInsert = Insertable<TagMapsTable>
export type TagMapUpdate = Updateable<TagMapsTable>
