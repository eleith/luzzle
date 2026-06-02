import { defineWorkflowSpec } from "openworkflow";
import type {
	JobProgressPurgePayload,
	JobProgressPurgeResult,
	PreviewPayload,
	PreviewResult,
	PublishPayload,
	PublishResult,
} from "./types.js";

export const jobProgressPurgeSpec = defineWorkflowSpec<
	JobProgressPurgePayload,
	JobProgressPurgeResult
>({
	name: "JobProgressPurge",
});

export const previewSpec = defineWorkflowSpec<PreviewPayload, PreviewResult>({
	name: "Preview",
});

export const publishSpec = defineWorkflowSpec<PublishPayload, PublishResult>({
	name: "Publish",
});
