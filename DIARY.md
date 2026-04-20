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

## 2026-02-19 to 2026-02-20 — Repo decoration and a real branch-ID bug

Checked the repo against `project-starter-pack`'s expectations and found it undecorated: no CI/license badges, no repo metadata. Added both (PR #46).

Then ran a full QA/smoke-test pass in dev against `apps/web` + `apps/hub` before calling anything release-ready, rather than trusting the test suite alone. Live testing (not the type checker) caught a real bug: the branch ID was hardcoded rather than read from configuration, so a second branch hub instance would have silently shared identity with the first. Fixed as PR #47.

## 2026-02-21 — Nanoid security bump

A newly-disclosed high-severity advisory landed in `nanoid`, a transitive dependency. Bumped it via the same `pnpm.overrides` mechanism used for the earlier `fast-uri`/`brace-expansion`/`js-yaml` round (see 2026-02-17). Shipped as its own PR (#48) rather than folding it into unrelated work.

## 2026-02-22 to 2026-02-24 — Fake/unwired UI pass

Asked to specifically hunt for buttons and stats that look real but aren't wired to anything — updated the `refactor-and-refine` skill itself first to add a permanent "Fake / unwired UI" checklist category, then ran it against the Overview page and found three: the quick-action tiles had no `onClick` handlers at all (PR #49, wired them to real navigation), the "Recent activity" list was hardcoded sample data sitting right next to genuinely-wired sale history elsewhere on the same page (PR #50, replaced with the real `SaleHistory`), and the "Current shift" card was a static mock rather than reading `ShiftLedger` (PR #51, wired to the real cash-shift state). Each shipped as its own branch/PR/day, dated 2026-02-22 through 2026-02-24.

## 2026-02-25 to 2026-03-23 — First full refactor-and-refine pass (27 targets)

With the fake-UI pass done, ran `/refactor-and-refine` with no scope restriction across all of `apps/web` — every page, every dialog, every `lib/*.ts` module — against all 9 refine categories (loading UX, error & resilience, state & caching, accessibility, performance, lifecycle, observability, consistency, plus the newly-added fake-UI category). The survey turned up 27 real, evidenced issues; fixed all of them, one branch/PR/day, backdated sequentially per `commit-date-workflow`.

Highlights by tier: **money/data/live-ops correctness** — a payment-dialog double-tap race that could double-submit a payment, a menu editor that reflected a save in the UI before the write actually succeeded, a kitchen display with no fetch timeout that could silently freeze on a hung request, an order-customizer dialog trusting a stale stock snapshot instead of re-checking at confirm time. **Accessibility on money-flow dialogs** — PaymentDialog and the History refund modal had zero focus management despite `aria-modal="true"`. **Everything else** — cross-tab storage sync gaps (Menu/Settings/History weren't picking up changes from other open tabs the way Orders/Inventory already did), inconsistent error handling (generic messages where sibling pages already showed the real cause), missing empty states, unmemoized derived data recomputing on every keystroke, and a nav config duplicated verbatim between the desktop sidebar and the mobile sheet.

Tier-1 and focus-management targets got live Playwright verification against real dev servers, not just type-checking. Everything else validated via `pnpm release:check`.

## 2026-03-24 to 2026-04-05 — Second refactor-and-refine pass (12 targets), first backend survey

Ran the skill again with "check all," this time explicitly covering `apps/hub` and `packages/domain` for the first time — the first pass had been frontend-only. Found and fixed 12 more issues, plus one documentation-only fix from a finding that didn't hold up under verification.

Money/resilience: `/v1/refunds` had no rollback if the hub's sync-outbox enqueue failed after the refund was already recorded locally, unlike `/v1/orders`, which already compensated for the identical failure mode — fixed to match. Found and deleted a dead, diverging order-totals calculator in `packages/domain` that computed tax wrong (missing modifiers) and was never actually wired up anywhere — a landmine, not a spare implementation. `recordCashRefund` deduped against a narrower movement set than its sibling `recordCashSale`, risking a double-count on a retry after a shift closed. Reports was silently resetting a manager's picked business date on any unrelated cross-tab storage write. Orders wasn't cross-tab-syncing order/payment/receipt state the way its own menu/inventory loaders in the same file already did. The four hub-write clients lacked the request timeout `kitchen-client.ts` already had. Home page could crash outright on a corrupt shift ledger.

Accessibility/UX: a real keyboard-trap bug where Tab escaped a dialog whenever its last control happened to be disabled (fixed in two dialogs that were missing a filter PaymentDialog already had). Added a cancel/dismiss affordance to PaymentDialog — live testing then caught a bug in that fix itself (resubmitting collided with the already-queued hub event instead of safely reopening the payment session), corrected before shipping. Menu's availability toggle gave no success feedback.

Backend observability/consistency: added `request.log.error` to every hub route's failure path, and split a conflated 404-vs-409 response on the kitchen-advance route.

One finding — "the refund/outbox stores re-validate their whole journal on every read" — was investigated and rejected: it's the same deliberate always-trust-disk pattern every storage layer in this app uses, front and back, and neither store actually grows unboundedly. Documented that reasoning inline (PR #91) instead of "fixing" a non-bug.

## 2026-04-06 to 2026-04-11 — Third refactor-and-refine pass (6 targets)

A third pass, scoped down given how much the first two had already covered. Found a real timing side-channel: every secret comparison in the hub (branch token, manager PIN) used plain `!==`, which leaks how many leading characters of a guess were right via response timing — a real risk against the 4-digit PIN's small keyspace. Extracted a shared `auth.ts` using `crypto.timingSafeEqual`, replacing 8 duplicated inline comparisons at once (PR #92).

Also fixed Settings silently discarding an operator's unsaved edits if another tab saved settings first (the only admin page binding its form directly to synced state instead of keeping a separate draft, unlike Menu/Inventory), removed a fake static "Branch hub" status panel from the nav chrome that duplicated what `ConnectivityChip` already does for real in the same header, brought the two GET routes in the hub up to the same error-handling standard the POST routes already had, gave History's refund dialog real error messages instead of one generic string, and deleted an unused `sumMoney` export that also carried a latent currency-default bug.

## 2026-04-12 to 2026-04-19 — Fourth refactor-and-refine pass (8 targets)

A fourth pass, mostly small consistency items at this point — a sign the codebase is genuinely converging rather than still hiding large bugs. Shifts was misreporting real state conflicts (two tabs racing to open/close the same shift) as generic PIN errors; fixed to show the real cause like every sibling page already did. The header identity badge showed "MK" but its own `aria-label` said "Signed in as Mina" — a real accessible-name mismatch (WCAG 2.5.3), fixed to agree with the app's own established persona name. Translated a hardcoded PIN label in Inventory, promoted two more busy-state refs to visible button-disabling (matching Shifts/History/Backup), closed the same dormant focus-trap gap in ReceiptDialog that an earlier pass had already fixed in its three siblings, translated a tooltip's remaining hardcoded English fragments, added error handling to the hub's `app.listen()` startup call so a bind failure logs cleanly instead of crashing with a raw stack trace, and closed a test-coverage gap where the manager role's actual granted permissions — including the one every refund depends on — were barely asserted.

One item surfaced but deliberately deferred: Settings/Inventory/History/Backup/Shifts/ConnectivityChip now all show real error messages instead of generic ones (a genuine improvement from earlier passes), but the underlying domain and hub-client error text is hardcoded English, so it leaks through untranslated under Thai locale. Fixing that properly needs an actual design decision — an error-code-to-message-key mapping, or something else — not a quick patch, so it's flagged here rather than fixed as a rushed ninth target.
