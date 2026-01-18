# ADR 0016: Reports as validated projections

## Decision

Reports are derived from validated immutable receipts and accepted refunds for a half-open business-date range. Money remains integer minor units. Cash tender reporting subtracts change, while product ranking uses sold quantities and line values.

## Consequences

- Reports never create a second financial source of truth.
- Refunds appear on the date they are processed, independent of the original sale date.
- The dashboard updates when another tab changes sale history.
