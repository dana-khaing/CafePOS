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
ledger and reserves its amount. An ambiguous failure retries that event
unchanged. Each attempt requires a manager approval PIN, verified only by the
branch hub. The hub also stores the supplied validated receipt and accepted
refunds in a private journal, independently enforcing receipt identity,
chronology, and the cumulative cap before queueing the event.

## Consequences

Sale history preserves both the original financial record and its subsequent
adjustments. The local manager PIN is an interim branch-device control; a future
staff-session service should replace it with a signed manager re-authentication
claim and per-manager audit identity.
