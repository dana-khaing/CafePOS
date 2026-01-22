# Contributing

CafePOS uses a branch-first delivery workflow.

1. Start each independently useful feature from the latest `main` branch.
2. Commit completed logical units as they are implemented.
3. Run focused checks throughout and `pnpm release:check` before review.
4. Include commands, manual scenarios, screenshots, and reviewer findings in
   the pull request description.
5. Merge only after required checks pass and review findings are resolved.

Use Conventional Commit-style subjects such as `feat:`, `fix:`, `test:`, and
`docs:`. Follow [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) for
deployment readiness and do not commit secrets, local databases, build output,
or customer data.
