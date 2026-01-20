# CafePOS release checklist

## Before deployment

- Use Node 22 and pnpm 10.13.1.
- Copy `.env.example`, set unique branch credentials and manager PIN, and never commit secrets.
- Run `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm audit --audit-level high`.
- Export and verify a backup from the production browser profile.
- Confirm hub `/health`, `/v1/status`, and `/v1/sync/status` return successfully.

## Operator smoke test

1. Open a manager-approved cash shift.
2. Complete one cash and one non-cash sale; print the bilingual receipt.
3. Confirm kitchen ticket, sale history, inventory consumption, and daily report.
4. Process a manager-approved partial refund and reconcile the drawer.
5. Test offline order queuing, reconnect, and confirm exact-once sync.
6. Export a backup and validate it on the recovery screen without restoring it.

## Rollback

- Stop new sales, export the current backup, deploy the previous known-good build, and restore only a backup validated by that build's supported schema.
- Record the release version, branch, operator, backup checksum, and incident reason.
