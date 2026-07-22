# CafePOS

CafePOS is an offline-first, multi-branch point-of-sale system for cafes and
restaurants in Myanmar and Thailand. It is designed for counter and table
service, with a Windows branch hub that keeps local operations running during
internet outages.

## Current status

The repository contains the full 20-feature POS system and its supporting
branch-hub workflow. Current work is limited to documentation, process
refinement, and release-readiness polish. Product features are not the focus of
the current roadmap.

## Workspace

- `apps/web` — Next.js installable web application and cloud back office.
- `apps/hub` — local branch service, LAN API, storage, printing, and sync agent.
- `packages/domain` — shared business contracts and deterministic calculations.

See [Architecture Decision 0001](docs/adr/0001-local-first-monorepo.md) for the
system boundaries and data ownership model.

## Requirements

- Node.js 22
- Corepack with pnpm 10.13.1

## Local development

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

The web app defaults to `http://localhost:3000`. The branch hub defaults to
`http://127.0.0.1:4310`, with health information at `/health`.

The staff interface supports English and Thai. The header language control
stores its selection on the device, while currency and dates use the browser's
locale-aware `Intl` formatters.

The release checklist lives in [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)
and should be followed before production deployment. Use it as the minimum
operator gate for backup validation, hub health checks, and smoke testing.
The broader go-live plan is documented in
[docs/PRODUCTION_READINESS_PLAN.md](docs/PRODUCTION_READINESS_PLAN.md).

## Quality checks

```bash
pnpm release:check
```

## Security and fiscal configuration

Never commit production credentials or customer data. Tax, receipt, retention,
and fiscal-device settings must be reviewed by qualified advisers in each
country before a production deployment. Follow the release checklist for the
minimum operator smoke test and backup validation steps.

## License

CafePOS is available under the [MIT License](LICENSE).
