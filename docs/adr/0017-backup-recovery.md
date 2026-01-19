# ADR 0017: Tamper-evident local recovery

## Decision

CafePOS exports critical validated ledgers in a versioned JSON envelope with a SHA-256 checksum. Restore validates the envelope and every included ledger before replacing local records, requires manager approval, and rolls back if a browser write fails.

## Consequences

- Corrupt or edited backups fail before changing live data.
- Restore is intentionally limited to known critical keys and schema version 1.
- Operators must keep exported files in appropriately protected storage.
