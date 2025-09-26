# Agents.md for @luzzle/cli

This document provides guidance for developers and AI assistants working on the
@luzzle/cli package.

## Guiding Principles

the cli package allows a user to manage their folder of markdown files in their
luzzle archive. each markdown file represents a record in their archive, with
the goal of being an inventory of generic pieces (ex: books, posts, games,
tools, etc etc)

## Architecture

the commands for the cli are managed in the `commands` folder. they cover every
possible luzzle operation from creating new piece types, to adding new pieces
(an entire markdown file),
adding fields in a piece (a frontmatter field in a markdown file) and more.

there is some lightweight structure to deal with management. there is a .luzzle
folder to contain various json.schema to define the structure of a piece type,
an .asset folder to manage associated attachments to a piece and a database that
is a one to one mapping for the entire archive, allowing for further development
that can stay in sync with the archive without reading through files one by one

### Monorepo Context

This package is part of the Luzzle monorepo. Refer to the root `Agents.md` file
for general information about the monorepo.

## Key Concepts

[TODO: Explain any key concepts, data structures, or terminology specific to
this package.]

## Development

### Getting Started

1. Install Node.js (version >=20) and npm.
2. Install dependencies from the root of the monorepo: `npm install`
3. Run this package's tests: `npm test -w @luzzle/cli`
4. Run this package's lint: `npm lint -w @luzzle/cli`
