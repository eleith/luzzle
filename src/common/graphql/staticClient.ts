import staticClient from '@app/lib/graphql/staticClient'
import schema from './schema'

const client = staticClient(schema)

export default client
