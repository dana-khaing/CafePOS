# ADR 0011: Branch payment capture

## Status

Accepted — January 13, 2026

## Decision

CafePOS captures cash, card, and QR tenders against the immutable total of a
submitted order. A payment can be split across tenders. Card and QR tenders
must match the remaining balance; cash may exceed it and produces explicit
change. A payment is complete only when the balance reaches zero.

The counter stores the validated session locally before transmission. Once a
session is paid, it also stores the exact completed-payment event before
contacting the authenticated branch hub. An ambiguous failure locks tender
entry and retries that same event identifier and payload, allowing the hub
outbox to deduplicate it safely.

## Consequences

Cashiers can recover an interrupted payment without charging a customer twice
or inventing a new completion time. Payment transport is local-first and does
not depend on cloud availability. Card and QR references currently represent
terminal handoff records; processor integrations and reconciliation remain a
future extension.
