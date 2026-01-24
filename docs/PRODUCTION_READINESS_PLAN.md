# Production readiness plan

CafePOS already ships the current 20-feature product scope. The remaining work
before a real cafe or restaurant can rely on it in production is operational
readiness, not new product features.

## 1. Environment and secrets

- Install Node.js 22 and Corepack pnpm 10.13.1 on the deployment and support
  machines.
- Copy `.env.example` to `.env` for each environment and set unique branch
  credentials, manager PINs, and service endpoints.
- Confirm no production credentials, customer data, or branch secrets are
  committed to the repository.

## 2. Branch hub and hardware

- Build and install the Windows branch hub on the production branch machine.
- Verify local LAN access, health endpoints, and service restart behavior.
- Test receipt printing on the actual printer model and paper width used by the
  branch.

## 3. Data and recovery

- Export a production-profile backup and verify that it restores on the target
  build.
- Confirm the backup schema matches the running build before attempting any
  recovery.
- Keep a rollback path that preserves the newest valid backup for forward
  recovery.

## 4. Operator smoke test

- Open a manager-approved cash shift.
- Complete one cash sale and one non-cash sale.
- Print the bilingual receipt.
- Confirm kitchen ticket generation, sale history, inventory consumption, and
  daily reporting.
- Process a manager-approved partial refund and reconcile the drawer.
- Test offline order queuing, reconnect, and exact-once sync.

## 5. Compliance and launch signoff

- Confirm tax, receipt, retention, and fiscal-device settings with qualified
  advisers in the target country.
- Record the final release version, branch, operator, backup checksum, and any
  launch notes.
- Treat the release checklist as the minimum gate and the production readiness
  plan as the wider launch record.

## Exit criteria

- The deployment environment matches the repo requirements.
- The branch hub and browser workflows work on the real hardware.
- Backup export and restore succeed on the target build.
- The operator smoke test passes without manual workarounds.
- All country-specific review items are signed off.
