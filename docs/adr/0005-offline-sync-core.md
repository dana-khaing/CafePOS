# ADR 0005: Offline synchronization core

- Status: accepted
- Date: 2026-01-07

## Decision

Every locally created mutation is represented by an immutable sync envelope
with a globally unique event ID, branch and actor identity, entity identity,
positive aggregate version, schema version, operation, timestamp, and JSON
payload. Deletes travel as versioned tombstones.

Replica application is idempotent by event ID. Lower aggregate versions are
stale; different events at the same version are explicit conflicts and are not
silently overwritten. Newer versions advance the replica.

The branch hub persists outbound events before delivery. Workers claim bounded
batches with expiring leases, acknowledge accepted events, and retry failures
with bounded exponential backoff. The initial journal uses a single-process
JSON store with serialized operations and atomic replacement, suitable for the
one-service-per-branch model.

## Consequences

Cafe operations can commit locally without waiting for cloud availability, and
repeated delivery is safe. Feature code must create the local business change
and its outbox event as one logical transaction; concrete menu/order storage
will define that transaction boundary in subsequent milestones.

Atomic rename protects against ordinary process interruption but is not a full
power-loss durability guarantee on every filesystem. January 19 resilience work
will add crash/fault drills, journal recovery, and stronger durability where
required. Conflict resolution must remain entity-specific and auditable.
