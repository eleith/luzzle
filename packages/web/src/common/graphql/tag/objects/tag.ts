import builder from '@app/lib/graphql/builder'
import { LuzzleSelectable } from '@luzzle/kysely'

const TagBuilder = builder.objectRef<LuzzleSelectable<'tags'>>('Tag')

export default TagBuilder // avoid circular issues

TagBuilder.implement({
	fields: (t) => ({
		id: t.exposeID('id', { nullable: false }),
		name: t.exposeString('name', { nullable: false }),
		slug: t.exposeString('slug', { nullable: false }),
		dateUpdated: t.exposeFloat('date_updated'),
		dateAdded: t.exposeFloat('date_added', { nullable: false }),
	}),
})
