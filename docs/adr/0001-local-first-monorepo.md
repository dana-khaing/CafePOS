# ADR 0001: Local-first monorepo architecture

- Status: Accepted
- Date: 2026-01-01

## Context

CafePOS must serve multiple tablets and computers during an internet outage,
while owners still need consolidated cloud reporting. The same business rules
must run in the till, branch hub, and reporting pipeline.

## Decision

Use a TypeScript monorepo with three initial boundaries:

- The Next.js application provides the touch POS, kitchen display, and cloud
  administration interfaces.
- A Windows-hosted Node service owns live branch operations in SQLite, exposes
  the LAN API, and later coordinates printing and cloud synchronization.
- A framework-independent domain package owns contracts and deterministic
  calculations shared by both runtimes.

The branch hub is authoritative for in-service operational data. Cloud services
are authoritative for organization identity and consolidated reporting.
Financial changes will be synchronized as immutable, idempotent events.

## Consequences

- A branch can trade while its internet connection is unavailable.
- Business calculations can be tested once and reused in every runtime.
- Hub installation, local TLS, backups, and synchronization require explicit
  operational tooling rather than relying only on a hosted web application.
