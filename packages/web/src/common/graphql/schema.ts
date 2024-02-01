import builder from '@app/lib/graphql/builder'

import './error/index'
import './book/index'
import './link/index'
import './discussion/index'
import './search/index'

const schema = builder.toSchema()

export default schema
