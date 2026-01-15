# ADR 0013: Sale history and refunds

## Status

Accepted — January 15, 2026

## Decision

Completed receipts are appended idempotently to a validated branch-local sale
ledger. Refunds are separate immutable records; they never rewrite the sale or
receipt. The domain permits partial refunds while preventing cumulative refunds
above the original gross amount, currency changes, backdating, duplicate IDs,
and cashier authorization. Refund creation requires a manager, admin, or owner.

Before network transmission, the browser stores the exact refund event in the
ledger. An ambiguous failure retries that event unchanged. The authenticated
branch hub validates its envelope and authorization claim, enforces branch
scope, and queues it idempotently in the durable outbox.

## Consequences

Sale history preserves both the original financial record and its subsequent
adjustments. The current role assertion originates on the trusted branch
device; a future staff-session service should replace that local assertion
with a signed manager re-authentication claim.
