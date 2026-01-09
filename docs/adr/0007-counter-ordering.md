# ADR 0007: Counter order drafts

## Status

Accepted — January 9, 2026

## Decision

Counter orders are immutable draft aggregates containing stable line IDs and
snapshots of item names, unit prices, selected modifiers, and tax rates. A line
quantity is always a positive safe integer; changing a quantity to zero removes
the line. Totals use the shared integer-minor-unit and tax calculation rules.

Drafts are validated before entering or leaving browser storage. Storage errors
fall back safely and never prevent staff from continuing an order. The initial
counter UI supports bilingual search and category filters, fast add, quantity
changes, clearing, and inclusive-tax totals on touch and desktop layouts.

## Consequences

Historical line values will not change if the menu is edited mid-order. The
draft is local to one browser until the order-submission and outbox feature
defines its lifecycle. Modifier selection UI, dining modes, discounts, payment,
and receipt issuance remain separate feature boundaries.
