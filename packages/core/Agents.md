# Agents.md for @luzzle/core 🫀

## Scope
Maintenance of the Luzzle spec: schema enforcement, asset management, and database indexing.

## Architecture
* **Database**: `better-sqlite3` + `kysely`. The schema is defined in `src/database/tables/`.
* **Migrations**: Mandatory for schema changes; found in `src/database/migrations/`.
* **Pieces**: `Pieces.ts` and `Piece.ts` are the primary entry points for archive interaction.
* **Storage**: All filesystem work must use the `Storage` abstractions in `src/storage/`.

## Quality
* Maintain coverage standards defined in `vite.config.ts`.
* Prioritize performance in indexing logic to ensure archives scale to thousands of pieces.
