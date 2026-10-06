import type { Kysely } from "kysely";
import { sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable("web_pieces")
		.addColumn("content_hash", "text")
		.execute();

	const tables = await db.introspection.getTables();
	const hasCache = tables.some((table) => table.name === "pieces_cache");
	if (!hasCache) return;

	// Trust the initial indexed state for existing web rows. Missing cache entries stay null.
	await sql`
		UPDATE web_pieces
		SET content_hash = (
			SELECT pieces_cache.content_hash
			FROM pieces_cache
			WHERE pieces_cache.file_path = web_pieces.file_path
		)
	`.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable("web_pieces").dropColumn("content_hash").execute();
}
