# Contributing

CafePOS uses a branch-first delivery workflow.

1. Start each independently useful feature from the latest `main` branch.
2. Keep one branch and one pull request per feature.
3. Commit completed logical units as they are implemented.
4. Run focused checks throughout and `pnpm release:check` before review.
5. Fill in the pull request template with commands, manual scenarios, screenshots,
   and reviewer findings.
6. Merge only after required checks pass and review findings are resolved.

Use Conventional Commit-style subjects such as `feat:`, `fix:`, `test:`, and
`docs:`. For the dated milestone flow used in this repository, keep commit dates
aligned with the feature day when you are preserving the historical sequence in
Git. Follow [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) for
deployment readiness and do not commit secrets, local databases, build output,
or customer data.
