# Project: Unified Generate Flow

This document tracks the plan and progress for refactoring the generation UX in the `@luzzle/web-editor` package.

## Objective
Simplify the user experience by removing the "Generate" workflow from the creation phase and integrating it into an iterative editing phase. This allows users to create a skeleton piece first, then use LLM tools to fill in details (single fields or all empty fields) on a separate review page.

## Proposed UX
1.  **Create:** Manual only.
2.  **Edit:** Standard form. Includes a "Generate" button.
3.  **Generate Page:** Separate route (`/pieces/generate/...`) with field selection, prompt, and file upload.
4.  **Review:** Returns to a form view with generated values highlighted (visual diff) but not yet saved to disk.
5.  **Save/Cancel:** Final decision to persist the LLM suggestions.

## Development Plan

### Branch: `feature/generate-flow`

- [x] **Step 1: Refactor & Cleanup "Create"**
    - Remove `generate` action from `packages/web/editor/src/routes/pieces/create/.../+page.server.ts`.
    - Remove "Generate" UI and toggle logic from `packages/web/editor/src/routes/pieces/create/.../+page.svelte`.
    - **Commit:** `refactor(web-editor): remove generate workflow from create route`

- [x] **Step 2: Componentize the Piece Form**
    - Create `packages/web/editor/src/lib/pieces/components/PieceForm.svelte`.
    - Refactor Edit page to use this component.
    - **Commit:** `refactor(web-editor): extract PieceForm component`

- [ ] **Step 3: Implement Visual Diff Logic**
    - Add `originalValue` prop to `FieldEdit` and `PieceForm`.
    - Add CSS highlights for modified fields.
    - **Commit:** `feat(web-editor): add visual diff indication to form fields`

- [ ] **Step 4: Scaffold "Generate" Route**
    - Create `routes/pieces/generate/[[directory]]/[...piece]` structure.
    - Add "Generate" button to the Edit page/form.
    - **Commit:** `feat(web-editor): scaffold generate route and link from edit page`

- [ ] **Step 5: Implement Generation Logic**
    - Implement server-side LLM call with schema slicing.
    - Connect the "Review" state to the Generate page UI.
    - **Commit:** `feat(web-editor): implement generation logic and review view`

## Verification Checklist
- [ ] `npm run lint` (in package)
- [ ] `npm run check` (in package)
- [ ] Manual browser verification of the full flow.
