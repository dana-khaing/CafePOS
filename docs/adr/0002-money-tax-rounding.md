# ADR 0002: Money, tax, and rounding

- Status: accepted
- Date: 2026-01-04

## Decision

CafePOS stores money as safe integer minor units with an explicit currency.
Floating-point monetary inputs are rejected. Domain arithmetic must preserve the
currency and must fail when currencies differ.

Tax rates use integer basis points. Tax is rounded half-up to the nearest minor
unit for each extended order line. Exclusive prices are treated as net and tax
is added; inclusive prices are treated as gross and tax is extracted. Order
totals are the sum of their rounded line breakdowns.

## Consequences

The same inputs produce the same totals in the web app, branch hub, receipts,
exports, and sync reconciliation. Country-specific deployments still need
qualified review of configured rates, exemptions, receipt wording, and any
legally mandated rounding policy before production use.
