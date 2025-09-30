# Agents.md for @luzzle/tools

This document provides guidance for developers and AI assistants working on the
@luzzle/tools package.

## Guiding Principles

The `@luzzle/tools` package provides a collection of command-line utilities to
automate common development and asset generation tasks within the Luzzle
monorepo. These tools are designed to be run from the command line and are
configured using command-line arguments.

## Architecture

This package contains a set of independent, single-purpose CLI tools. Each tool
is located in its own directory within `src/` and uses the `yargs` library to
parse command-line arguments. The main entry point for each tool is typically an
`index.ts` file, with argument parsing logic in `yargs.ts`.

## Key Concepts

This package includes the following tools:

*   **`generate-image-variants`**: A tool to create different formats (e.g.,
    `avif`, `jpg`) and sizes of a specific image asset.
*   **`generate-open-graph`**: A utility to generate Open Graph images (e.g., for
    social media sharing) from a template file.
*   **`generate-web-images`**: A comprehensive tool for preparing images for the
    web. It has two main commands:
    *   `variants`: Generates web-optimized variants for all images.
    *   `opengraph`: Generates Open Graph images for all relevant pieces.
*   **`generate-web-sqlite`**: A tool to create a web-ready SQLite database from
    the main Luzzle database.

## Development

### Getting Started

1.  Install Node.js (version >=20) and npm.
2.  Install dependencies from the root of the monorepo: `npm install`
3.  You can run each tool directly using `node`, for example: `node
    packages/tools/dist/generate-image-variants/index.js --help`

### Testing

When writing tests for the `@luzzle/tools` package, please adhere to the following standards:

*   **Mocking and Spying**: Use `vi.mock` to mock modules and `vi.spyOn` to spy on functions. This allows you to isolate the code you are testing and control its dependencies.
*   **Resetting Mocks and Spies**: It is crucial to reset mocks and spies after each test to ensure that tests are independent and do not interfere with each other. The following `afterEach` block should be used in all test files:

	```typescript
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})
	```

*   **Testing Un-exported Functions**: To test functions that are not exported, you can copy the function into the test file. This allows you to test the function directly without having to export it from the module.
*   **Testing Error Cases**: It is important to test error cases to ensure that your code handles errors gracefully. You can use `mockRejectedValue` to simulate errors and `expect(...).rejects.toThrowError()` to assert that the correct error is thrown.
*   **Run Tests After Every Change**: To ensure that you are not breaking anything, it is important to run the tests after every change. You can run the tests for the `@luzzle/tools` package with the following command:

	```bash
	npm run test -w @luzzle/tools
	```
