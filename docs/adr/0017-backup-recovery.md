# ADR 0017: Tamper-evident local recovery

## Decision

CafePOS exports critical validated ledgers and in-flight recovery records in a versioned JSON envelope with a SHA-256 integrity checksum. Restore validates every included operational record, requires manager approval, and attempts every rollback write if replacement fails.

## Consequences

- Accidental corruption is detected before changing live data. The unkeyed checksum does not authenticate who created or edited a backup.
- Restore is intentionally limited to known critical keys and schema version 1.
- Operators must keep exported files in appropriately protected storage.
