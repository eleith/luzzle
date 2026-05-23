import { createJobStub } from '../factory.js'
import type { PreviewPayload, PreviewResult } from '../types/preview.js'

export const Preview = createJobStub<PreviewPayload, PreviewResult>('Preview')
