# ADR 0015: Local-first ingredient inventory

## Decision

Inventory is a validated, versioned ledger in browser storage. Completed receipts consume recipes exactly once. All writers use a browser-wide lock, while manager-approved adjustments retain actor, reason, and timestamp.

## Consequences

- Stock stays usable during a hub outage and synchronizes across open tabs.
- Corrupt ledgers fail closed instead of silently resetting.
- Recipes use integer base units (`g`, `ml`, or `each`) to avoid floating-point drift.
