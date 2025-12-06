# Agents.md for @luzzle/web.utils

This document provides guidance for developers and AI assistants working on the
@luzzle/web.utils package.

## Guiding Principles

This package serves as a shared library for code common to both `@luzzle/web`
(Explorer) and `@luzzle/web.tools`. It prevents code duplication for core types,
constants, and helper functions.

## Architecture

A simple TypeScript library exporting utilities.

* Exports:**
    *   `lib/assets.ts`: Helpers for asset paths and types.
    *   `lib/config`: Configuration schemas and types.
    *   `lib/types.ts`: Shared TypeScript interfaces (Props, Palettes).

## Key Concepts

* Single Source of Truth:** Defines the shared types used across the web
    ecosystem (e.g., what a "Piece" looks like to the frontend).

## Development

* Test:** `npm test`
* Build:** `npm run build`
