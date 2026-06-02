import { OpenWorkflow } from "openworkflow";
import { BackendSqlite } from "openworkflow/sqlite";

let owInstance: OpenWorkflow | null = null;

export interface InitOpenWorkflowOptions {
	dbPath: string;
}

export function initOpenWorkflow(opts: InitOpenWorkflowOptions): OpenWorkflow {
	if (!owInstance) {
		const backend = BackendSqlite.connect(opts.dbPath);
		owInstance = new OpenWorkflow({ backend });
	}
	return owInstance;
}

export function getOpenWorkflow(): OpenWorkflow {
	if (!owInstance) {
		throw new Error(
			"OpenWorkflow client has not been initialized. Call initOpenWorkflow({ dbPath }) first.",
		);
	}
	return owInstance;
}
