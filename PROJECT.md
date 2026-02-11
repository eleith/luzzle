# Project: Robust Frontmatter (Arrays & Objects)

## Overview
Refactor frontmatter to use native JSON (fixing array corruption) and support nested structures. The project is structured into incremental PRs to ensure `main` remains stable and the database cache stays consistent.

## Goals
1.  **Fix Array Corruption:** Move from CSV-in-JSON to native JSON arrays.
2.  **Support Nested Objects:** Recursive support in Core, CLI, and Web (1-level deep).
3.  **Path-Based Access:** Support dot-notation (e.g., `author.name`) in CLI and Core.

---

## Phased Delivery Plan

### Phase 1: Core Foundation & Cache Migration (PR #1)
**Goal:** Fix data corruption and enable the new storage format.
- **Changes:**
    - [x] `packages/core/.../frontmatter.ts`: Update types and refactor `toDatabaseValue`/`fromDatabaseValue` to use JSON for arrays/objects.
    - [ ] `packages/core/.../item.ts`: Implement recursive "asset walker" to find all `format: asset` fields.
    - [ ] `packages/core/.../migrations/`: Add migration to clear `pieces_items` table.
- **Tests:** 
    - [x] Convert `frontmatter.repro.test.ts` cases into permanent unit tests in `frontmatter.test.ts`.
    - [x] Delete `frontmatter.repro.test.ts` once verified.
    - [ ] Add new integration tests in `item.test.ts` for complex structures.
- **Risk:** High (DB Cache). **Mitigation:** Immediate migration to clear cache upon deployment.

### Phase 2: Path Utility & Core Integration (PR #2)
**Goal:** Enable the engine to get/set/remove values by path.
- **Changes:**
    - **Add** `packages/core/.../path.ts`: Utility for dot-notation (e.g., `get(obj, 'a.b.0')`).
    - `packages/core/src/pieces/Piece.ts`: Update `setField`/`removeField` to use the path utility.
    - **Logic:** `setField` appends to arrays by default. `removeField` handles indices.
- **Tests:** 100% coverage for `path.ts`. Integration tests in `Piece.test.ts`.
- **Risk:** Low. This is additive logic for the engine.

### Phase 3: CLI Implementation (PR #3)
**Goal:** Expose dot-notation to the user.
- **Changes:**
    - `packages/cli/.../field.ts`: Update commands to accept path strings and pass them to the Core engine.
- **Tests:** CLI integration tests verifying `luzzle field set id "a.b" "val"`.
- **Risk:** Low. UI-only change for the CLI.

### Phase 4: Web Explorer UI (PR #4)
**Goal:** Polish the UX for nested editing.
- **Changes:**
    - `packages/web/explorer/.../comparison.ts`: Implement deep object comparison for "isModified" tracking.
    - `packages/web/explorer/.../edit.svelte`: Implement recursive rendering with a 1-level depth limit and fallback message.
- **Tests:** Vitest for comparison utility. Manual verification of Svelte component states.
- **Risk:** Low. Only affects the editing interface.

---

## Technical Inventory & Coverage Requirements

| Package | File | Action | Test Requirement |
| :--- | :--- | :--- | :--- |
| **Core** | `frontmatter.ts` | Update | 100% Branch Coverage |
| **Core** | `path.ts` | **New** | 100% Branch Coverage |
| **Core** | `item.ts` | Update | Integration test for nested assets |
| **Core** | `Piece.ts` | Update | Unit tests for append/remove logic |
| **CLI** | `field.ts` | Update | Integration test for dot-notation |
| **Web** | `edit.svelte` | Update | Visual regression check |
| **Web** | `comparison.ts` | Update | Unit tests for deep objects |
