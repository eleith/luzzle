# Agents.md for @luzzle/web.tools

This document provides guidance for developers and AI assistants working on the
@luzzle/web.tools package.

## Guiding Principles

This package provides the necessary build tools and CLI utilities to support the
Luzzle Web Explorer. It handles tasks that require heavy processing or file
generation, keeping the main web app lightweight.

The expectation is a CI/CD process uses this tool when preparing an instance of
a luzzle explorer

## Architecture

A CLI tool built with `yargs`.

* **Commands:**
  * `theme`: Generates CSS variables from `config.yaml`.
  * `opengraph`: Generates OG images for pieces.
  * `assets`: generates various sizes for images associated with
pieces
  * `sqlite`: creates a web database to be used by the explorer

## Key Concepts

* **Build-Time Generation:** Most of these tools are intended to run *before*
    the Web Explorer starts or during the Docker build process.

## Development

* **Test:** `npm test`
* **Build:** `npm run build`
