# CafePOS enforcement matrix

This document separates what CafePOS actively blocks, what it warns about, and
what it only reports for operator awareness.

## Blocked

- Orders from unauthenticated or non-member staff
- Sold-out menu items and unavailable modifier options
- Inventory edits, settings changes, and backup restores without manager PIN
- Invalid, tampered, or schema-mismatched backups
- Refunds or shift actions that fail their role or approval checks

## Warned

- Low-stock menu items that are still sellable
- Hub disconnects, reconnects, and transient sync failures
- Pending queue growth on the hub or device
- Backup exports that succeed but still need validation before restore

## Informational

- Branch hub readiness and latency
- Daily sales, weekly comparisons, and history summaries
- Branch provisioning and admin/owner credential issuance, which are external
  operational processes rather than cashier actions

## Operator rule of thumb

- If the action can corrupt money, stock, or recovery state, it should be
  blocked until the required approval or validation passes.
- If the action is still safe but should draw attention, it should warn.
- If the action is only status or reporting, it should remain informational.
