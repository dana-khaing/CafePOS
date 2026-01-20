# ADR 0018: Manager-controlled branch settings

## Decision

Branch identity, IANA timezone, receipt footer, and printer width are validated settings stored under the shared critical-storage lock. Changes require live manager PIN verification and are included in schema-versioned backups.

## Consequences

- Invalid timezones and unsupported paper widths fail before persistence.
- Financial currency is intentionally not mutable from settings after transactions exist.
- Release operators have a documented smoke test and rollback sequence.
