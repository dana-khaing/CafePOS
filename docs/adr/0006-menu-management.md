# ADR 0006: Menu management

- Status: accepted
- Date: 2026-01-08

## Decision

Menus use integer-minor-unit prices in one configured currency. Categories,
items, SKUs, modifier groups, and options have stable IDs. English names are
required and Thai names are optional. Items reference an existing category,
tax rate, and modifier groups; modifier selection bounds cannot exceed their
available options.

Availability is an explicit item/option property rather than deletion. This
preserves historical order references while letting staff stop sales quickly.
The first UI slice provides bilingual search, category filters, modifier
visibility, and accessible availability controls.

## Persistence boundary

The installable web app validates and stores this first menu snapshot on the
local device so availability changes survive reloads and internet outages.
This does not yet claim branch-wide multi-terminal consistency. The branch hub
will become the authoritative local menu store when menu mutation endpoints are
connected to the January 7 outbox contract; cloud distribution will use the
same stable IDs and aggregate versions.

## Consequences

Ordering code can consume a validated menu and cannot reference missing
categories or modifier groups. Full category/item/modifier creation forms,
image assets, scheduled availability, inventory-driven availability, and
multi-terminal propagation are later extensions of these contracts.
