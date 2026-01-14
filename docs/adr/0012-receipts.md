# ADR 0012: Recoverable sale receipts

## Status

Accepted — January 14, 2026

## Decision

A receipt is an immutable snapshot that binds a validated order, its
recalculated tax totals, and a completed payment from the same order, branch,
actor, and timestamp. Receipt numbers are deterministic from the payment date
and order identity, so retrying issuance does not create a second sale record.

The current receipt is stored locally before it is shown. It remains available
after a reload until the cashier explicitly starts a new order. The web receipt
is bilingual, itemized, shows each tender and cash change, and includes a
print-only layout that hides application chrome and controls.

## Consequences

An interrupted browser session can recover the customer receipt without
repeating payment. Browser printing provides a portable baseline for Windows
and network printers; direct ESC/POS device routing can be added to the branch
hub without changing the receipt snapshot.
