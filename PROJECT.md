# Project: Decouple @luzzle/core and @luzzle/cli

## 1. Objective

The primary goal of this project is to refactor and decouple the `@luzzle/cli` and `@luzzle/core` packages. Currently, consumer packages like `@luzzle/web/explorer` and `@luzzle/web/editor` have a dependency on `@luzzle/cli` for APIs, which is an architectural code smell.

The desired end state is a clear separation of concerns:
-   `@luzzle/core`: A self-contained, reusable library of TypeScript modules for interacting with Luzzle archives.
-   `@luzzle/cli`: A thin command-line interface that consumes `@luzzle/core`.
-   All other packages in the monorepo must only depend on `@luzzle/core`.

## 2. Guiding Principles

-   **Self-Contained Core**: `@luzzle/core` modules will be self-contained. They will not read external configuration files or environment variables. All necessary context (e.g., clients, configuration) will be passed explicitly as parameters or injected into class constructors.
-   **Separation of Concerns**: The `@luzzle/core` library will not perform logging; it will throw structured errors or return result objects. The consuming application (`@luzzle/cli`) is responsible for catching errors and logging outcomes.
-   **CLI Responsibility**: `@luzzle/cli` is responsible for reading configuration, managing state, handling user-facing interactions (including logging), and calling `@luzzle/core` modules.
-   **Safe, Incremental Commits**: The migration will be performed in small, atomic, and testable steps. Each step will result in a distinct commit, ensuring the project remains stable.

## 3. Execution Order

The migration is broken into three groups, ordered from simplest to most complex, to be executed sequentially.

### Group 1: LLM Function (Easiest) [DONE]
-   **Goal**: Move the self-contained `pieceFrontMatterFromPrompt` function to `@luzzle/core`.
-   **Plan**:
    1.  Create a new directory `packages/core/src/llm/`.
    2.  Move `packages/cli/src/lib/llm/google.ts` to `packages/core/src/llm/google.ts`, and move its corresponding test file.
    3.  Add `@google/genai` and `file-type` as dependencies to `@luzzle/core`.
    4.  Export the function from `@luzzle/core`'s main `index.ts`.
-   **Commit Strategy**:
    1.  `feat(core): add pieceFrontMatterFromPrompt function` - Copy the function and tests to `core`, adapt tests, and update dependencies.
    2.  `refactor(cli): use pieceFrontMatterFromPrompt from core` - Update the CLI to import and use the new function.
    3.  `refactor(cli): remove redundant LLM function` - Delete the original file from the CLI.

### Group 2: Storage Abstraction (Medium) [DONE]
-   **Goal**: Move the entire storage abstraction layer to `@luzzle/core`. This is a prerequisite for Group 3.
-   **Plan**:
    1.  Create `packages/core/src/storage/`.
    2.  Move `packages/cli/src/lib/storage/storage.ts` to `packages/core/src/storage/index.ts`. Rename the abstract `Storage` class to `LuzzleStorage` for specificity.
    3.  Move the concrete implementations `fs.ts` and `webdav.ts` into `packages/core/src/storage/`.
    4.  Add `fdir` and `webdav` as dependencies to `@luzzle/core`.
    5.  Export all classes from the module.
-   **Commit Strategy**:
    1.  `feat(core): add storage abstraction layer` - Copy all storage files and tests to `core`, adapt tests, update dependencies.
    2.  `refactor(cli): use storage module from core` - Update the CLI to import and use the new storage classes.
    3.  `refactor(cli): remove redundant storage implementation` - Delete the original storage directory from the CLI.

### Group 3: Piece & Frontmatter Logic (Hardest)
-   **Goal**: Move the high-level `Piece` and `Pieces` orchestration classes to `@luzzle/core`.
-   **Plan**:
    1.  Move `packages/cli/src/lib/pieces/piece.ts` to `packages/core/src/pieces/Piece.ts` and `pieces.ts` to `packages/core/src/pieces/Pieces.ts`.
    2.  Refactor their constructors to accept all dependencies (the `LuzzleStorage` interface, config paths) via injection.
    3.  Refactor methods to remove logging side effects, replacing them with return values and thrown errors.
    4.  (Recommended) Rename helper files in `core` for clarity (e.g., `item.ts` → `item.transforms.ts`).
-   **Commit Strategy**:
    1.  `feat(core): add Piece and Pieces classes` - Copy classes and tests to `core`, adapt tests, and perform refactoring within `core`.
    2.  `refactor(cli): use Piece and Pieces classes from core` - Update the CLI to import and use the new classes from `core`.
    3.  `refactor(cli): remove redundant piece classes` - Delete the original files from the CLI.


### Phase 3: Finalization
*After all groups are migrated:*

10. **[TODO] Eliminate `cli/sdk.ts`**: The `packages/cli/src/sdk.ts` file should now be obsolete. Delete it.
11. **[TODO] Update Dependencies**: Remove `@luzzle/cli` from the `dependencies` list in the `package.json` of `@luzzle/web/editor`.
12. **[TODO] Final Verification**: Run `npm install` from the root, followed by the entire monorepo test suite (`npm test --workspaces`) to confirm project stability.
