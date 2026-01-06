# ADR 0004: Windows branch hub

- Status: accepted
- Date: 2026-01-06

## Decision

Each branch runs a Node.js hub as a Windows service. The hub defaults to
`127.0.0.1:4310`; listening on all interfaces requires explicit
`HUB_ALLOW_LAN=true`. Browser access is restricted to configured origins, and
the web app determines connectivity by probing the hub status API rather than
using the device's generic network state.

WinSW integrates the process with Windows Service Control Manager. Installation
resolves an absolute Node.js executable, uses delayed automatic startup,
restarts after failures, and rotates logs. Configuration is loaded from the hub
working directory's `.env` file.

## Trust boundary

The health and branch-status endpoints expose no credentials or customer data.
Future mutating LAN endpoints require enrolled-device authentication and must
not rely on CORS as authorization. Cloud service-role credentials must never be
stored on a branch hub.

## Consequences

The POS can distinguish an unavailable branch service from a general internet
outage. Windows installation still requires a trusted, checksummed WinSW binary
and validation on the target Windows version. TLS, local DNS, firewall rules,
certificate rotation, and unattended upgrades are production-readiness work.
