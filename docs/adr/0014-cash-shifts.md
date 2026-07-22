# ADR 0014: Cash shifts and drawer reconciliation

## Status

Accepted — January 16, 2026

## Decision

Each branch drawer has at most one open local shift. Opening, paid-in, paid-out,
and closing actions require a manager PIN verified by the branch hub. The shift
records an opening float and immutable, uniquely identified cash movements.

Cash receipts automatically add the tender retained after change; accepted
refunds automatically subtract their amount. Both projections are idempotent.
Closing freezes expected cash, manager-counted cash, and the signed variance.

## Consequences

The drawer can be reconciled without cloud connectivity and retains a clear
audit trail of adjustments. The interim shared branch manager PIN should later
be replaced with signed per-manager sessions.
