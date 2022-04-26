import staticClient from '@app/graphql/staticClient'
import schema from './schema'

const client = staticClient(schema)

export default client
