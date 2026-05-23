import { createJobStub } from '../factory.js'
import type { PublishPayload, PublishResult } from '../types/publish.js'

export const Publish = createJobStub<PublishPayload, PublishResult>('Publish')
