# ADR 0010: Branch kitchen display

## Status

Accepted — January 12, 2026

## Decision

Accepted submitted orders are projected into price-free kitchen tickets stored
in a branch-local journal. Tickets advance only through queued, preparing,
ready, and completed states, with monotonic timestamps. Repeated acceptance of
the same order is idempotent.

The authenticated KDS polls the branch hub, presents quantities, modifiers,
notes, service mode, and arrival time, and uses one large action per state.
Completed tickets leave the active queue but remain in the journal for recovery
and later operational reporting.

## Consequences

Kitchen operation continues without cloud connectivity and never exposes sale
prices unnecessarily. The current order/outbox and kitchen journals are written
sequentially; January 19 resilience work will consolidate crash recovery and
cross-journal reconciliation.
