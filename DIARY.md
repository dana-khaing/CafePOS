# CafePOS project diary

## Retrospective: PRs #1–#42 (compiled 2026-02-18)

This section is a **compiled retrospective**, written after the fact from `git log` and `docs/adr/`, not a contemporaneous day-by-day journal — those PRs shipped before this diary existed, and rewriting their already-merged commits to carry fabricated per-day entries would mean rewriting published history, which we don't do. Going forward, each entry below is a real first-person log written on the day the work happened.

CafePOS started as a bootstrap monorepo (turbo workspaces, `apps/web`, `apps/hub`, `packages/domain`, CI baseline) and built out, PR by PR, into an offline-first, multi-branch cafe/restaurant POS:

- **Foundations** (PRs #1–#5): design system + installable PWA shell, English/Thai localization, the core money/tax/rounding domain, and multi-tenant cloud auth with row-level security.
- **Branch hub & sync** (PRs #6–#7): the Windows-packaged branch hub service and the offline sync core — versioned event contracts, a retryable outbox, atomic journal, stale-worker fencing.
- **Order lifecycle** (PRs #8–#14): menu management, counter ordering, dining modes, order submission with idempotent hub acceptance, the kitchen display, payment capture, and printable receipts.
- **Money after the sale** (PRs #15–#19): refunds and sale history, cash-drawer shift reconciliation, ingredient inventory driven by recipe consumption, trusted sales reporting, and tamper-evident backup/recovery.
- **Release groundwork** (PRs #20–#26): branch settings, an operator release checklist, documentation refreshes, and inventory-editor polish.
- **Hardening & small features** (PRs #27–#34): production-hardened hub connectivity, and a run of small UI wiring features (new-order/view-all buttons, weekly sales comparison, two-week report summary, archived shifts, a connectivity-chip hydration fix, a hub reload animation).
- **Audit & docs passes** (PRs #38–#42): button-labeling and date-formatting audit fixes, stock-driven menu availability, release-readiness documentation, a broader UI bug audit, the release-enforcement matrix, and an expanded user guide.

By PR #42 the product covered all 18 of the ADRs in `docs/adr/` and the README described it as feature-complete, with remaining work framed as operational readiness (see `docs/PRODUCTION_READINESS_PLAN.md`) rather than new product features.

One thing this retrospective surfaced: a feature branch (order customization popup/modifiers on the Orders page) had been fully built and tested back in this same era but was never merged — it forked before the stock-driven-availability and localization work landed, went stale, and sat unmerged for months. See 2026-02-16 below for how it finally landed.

---

## 2026-02-16 — Order customization popup

Finished and merged the order-customization popup (`OrderCustomizerDialog`) that had been sitting on a stale, unmerged branch. Instead of picking modifiers inline on each menu card and adding to the order immediately, staff now open a dialog per item and can only confirm once the required modifier groups are satisfied.

The branch it came from had forked about 140 commits behind current `timeline`, so landing it wasn't a trivial merge. Two of its four original commits (a cafe date-formatting fix) turned out to already be shipped via PR #38 — bringing them forward would have reverted or duplicated already-merged work, so I dropped them. The remaining popup work had a real conflict with the stock-driven-availability feature that had landed since: I kept the sold-out/low-stock/unavailable badges and the `stockState.sellable` gate, and layered the dialog-based flow on top instead of the old inline per-card modifier buttons. Also caught and fixed a duplicate-key regression the merge introduced in `messages.ts` (`required`/`optional` were defined twice — the popup's copy versus the pre-existing inline picker's copy).

Shipped as PR #43 against `timeline`.

## 2026-02-17 — Patched CI-blocking dependency vulnerabilities

While validating the order-customizer PR, `pnpm audit --audit-level high` started failing — not from anything in that branch, but from five newly-disclosed high-severity advisories in transitive dependencies (`fast-uri` via two different `fastify` sub-dependencies, `brace-expansion`, `js-yaml`, `nanoid`). Confirmed it was pre-existing by running the same audit against `timeline`'s tip with no changes at all — it would have blocked every open PR, not just #43.

Extended the existing `pnpm.overrides` block in root `package.json` rather than waiting for upstream releases: bumped `brace-expansion`, added flat overrides for `js-yaml` and `nanoid`, and used path-scoped overrides for `fast-uri` since its two vulnerable ranges sit on different major versions depended on by different consumers (`fast-json-stringify` vs `@fastify/ajv-compiler`). Shipped as its own PR (#44) ahead of the order-customizer PR, then rebased #43 on top so it would pick up the fix.

## 2026-02-18 — Project diary

Added this diary. CafePOS didn't have one before now — `project-starter-pack` expects a dated, first-person log of what was built and why, alongside the ADRs that record _how_ things are designed. Backfilled a compiled (not fabricated day-by-day) summary of the pre-diary history above, and this file will get a real entry alongside future feature and refactor-pass commits from here on.
