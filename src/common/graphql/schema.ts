import builder from '@app/lib/graphql/builder'
import './book'
import './discussion'

const schema = builder.toSchema({})

export default schema
