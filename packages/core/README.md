# @luzzle/core 🫀

The foundational implementation of the Luzzle specification. It solves the inherent challenges of managing large-scale digital records using plain text.

## Challenges Solved 🏗️

* **Consistency**: Enforces structure across thousands of records using JSON schemas.
* **Organization**: Standardizes where files and attachments (`.assets/`) live within an archive.
* **Scale**: Maps thousands of text files into a high-performance SQLite index, enabling complex queries and fast searching without slow filesystem traversal.
* **Portability**: Provides a unified Storage abstraction (Local, WebDAV) so your data remains accessible anywhere.

## How it works 🚂

Core treats your filesystem as the primary database. It parses Markdown, validates frontmatter, and maintains a derivative SQLite cache for application-layer performance.
