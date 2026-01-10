# ADR 0008: Modifiers and dining modes

## Status

Accepted — January 10, 2026

## Decision

Every draft identifies one dining mode: counter, takeaway, or table. Table
orders require a non-empty table number, while other modes cannot carry one.
The value is persisted with the validated offline draft.

Selected modifier options are copied onto order-line snapshots with their
display name and integer-minor-unit price. Lines only combine when both their
menu item and modifier-option signature match. This prevents large and regular
drinks, or dairy and alternative-milk drinks, from being merged accidentally.

## Consequences

Cashiers can prepare common cafe variations without changing menu base prices,
and kitchen routing can rely on an explicit service mode in the next feature.
The initial options cover large size and oat milk; full manager-authored option
groups continue to use the menu model and can replace these seeded choices.
