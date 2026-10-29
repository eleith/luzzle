import { registerJobProgressPurgeWorkflow } from './job-progress-purge.js'
import { registerPreviewWorkflow } from './preview.js'
import { registerPublishWorkflow } from './publish.js'
import { registerPublishAuditWorkflow } from './publishAudit.js'
import { registerTestConnectivityWorkflow } from './testConnectivity.js'
import { registerUnpublishWorkflow } from './unpublish.js'

export function registerWorkflows(): void {
	registerJobProgressPurgeWorkflow()
	registerPreviewWorkflow()
	registerPublishWorkflow()
	registerPublishAuditWorkflow()
	registerUnpublishWorkflow()
	registerTestConnectivityWorkflow()
}
