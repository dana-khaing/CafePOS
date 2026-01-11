# ADR 0009: Order submission and local outbox

## Status

Accepted — January 11, 2026

## Decision

Submitting a non-empty validated draft creates an immutable version-one order
snapshot and a matching `order` upsert event. The snapshot records branch,
cashier, submission time, service details, lines, modifiers, taxes, and totals.

The web counter sends the event to its branch hub. The hub validates schema,
branch ownership, entity type, and operation before atomically appending it to
the durable local outbox. Only a successful `202 queued` response clears the
browser draft; connectivity or validation failures leave the draft intact.

## Consequences

An accepted counter action survives internet loss because cloud delivery starts
from the branch-local journal. Event IDs make repeated enqueue requests
idempotent when their content matches. Kitchen display will consume submitted
order snapshots in the January 12 feature.
