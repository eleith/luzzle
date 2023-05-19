import builder from '@app/lib/graphql/builder'
import { Tag } from '@luzzle/prisma'

const TagBuilder = builder.objectRef<Tag>('Tag')

export default TagBuilder // avoid circular issues

TagBuilder.implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    name: t.exposeString('name', { nullable: false }),
    slug: t.exposeString('slug', { nullable: false }),
    dateUpdated: t.field({ type: 'Date', resolve: (x) => x.date_updated, nullable: false }),
    dateAdded: t.field({ type: 'Date', resolve: (x) => x.date_added, nullable: false }),
  }),
})
