# ADR 0003: Cloud tenancy and authentication

- Status: accepted
- Date: 2026-01-05

## Decision

CafePOS uses Supabase Auth for cloud staff identities and Postgres row-level
security for tenant isolation. Public signup is disabled: staff access is
invite-only. Organizations own branches, membership roles are organization
scoped, and optional branch assignments narrow a staff member's operating area.

Every tenant table carries or derives an organization identifier. RLS is forced
and policy columns are indexed. Security-definer membership helpers live in the
unexposed `private` schema, use an empty search path, and always bind checks to
`auth.uid()`. Application authorization mirrors the database roles but never
replaces database enforcement.

## Consequences

Cloud requests fail closed without an authenticated membership. Service-role
credentials remain server-only and must never be shipped to the browser or a
branch device. Production identity providers, invitation delivery, MFA policy,
session lifetime, and recovery procedures require deployment-specific review.
