## Development Methodology

**TDD is mandatory.** All code must be written using:

- **Red-Green-Refactor**: Write a failing test first, implement the minimum to pass, then refactor.
- **Dan North's CUPID framework**:
  - **Composable**: Small, focused units that combine well
  - **Unix philosophy**: Do one thing well
  - **Predictable**: Behaves as expected, no surprises
  - **Idempotent**: Safe to call multiple times
  - **Domain-based**: Code reflects the problem domain language
- **High test coverage**: All business logic, API routes, and data transformations must have tests.
- **Clean code**: Readable, well-named, minimal complexity.

## Feature Documentation

When adding or completing a feature:

1. **Update `features.md`** — mark completed items with `[x]`, add new items under the appropriate section.
2. **Update the help overlay** in `index.html` — the `#help-overlay` content should reflect all current features so users can discover them. Keep it concise and scannable.
