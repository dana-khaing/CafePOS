# CafePOS

CafePOS is an offline-first, multi-branch point-of-sale system for cafes and
restaurants in Myanmar and Thailand. It is designed for counter and table
service, with a Windows branch hub that keeps local operations running during
internet outages.

## Current status

The repository contains the project foundation. Product capabilities are added
incrementally through one feature branch and pull request per dated milestone.

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

## Quality checks

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Security and fiscal configuration

Never commit production credentials or customer data. Tax, receipt, retention,
and fiscal-device settings must be reviewed by qualified advisers in each
country before a production deployment.

## License

CafePOS is available under the [MIT License](LICENSE).
