# CafePOS release checklist

## Before deployment

- Use Node 22 and pnpm 10.13.1.
- Copy `.env.example`, set unique branch credentials and manager PIN, and never commit secrets.
- Run `pnpm release:check`.
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

- Stop new sales and export a current backup for forward recovery. Deploy the previous known-good build without importing a newer-schema backup; restore only a backup originally created and validated by the target build.
- Record the release version, branch, operator, backup checksum, and incident reason.
