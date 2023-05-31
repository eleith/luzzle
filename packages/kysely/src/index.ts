import { getDatabaseClient } from './database'
import { LuzzleDatabase } from './database.schema'
import migrate from './database.migrations'

export type {
  Book,
  BookInsert,
  BookUpdate,
  BooksTable,
  Tag,
  TagInsert,
  TagUpdate,
  TagsTable,
  TagMap,
  TagMapInsert,
  TagMapUpdate,
  TagMapsTable,
} from './database.schema'

export { getDatabaseClient, type LuzzleDatabase, migrate }
