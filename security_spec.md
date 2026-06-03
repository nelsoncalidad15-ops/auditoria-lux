# Security Specification - Audit LUX

## Data Invariants
1. An audit must have a valid branch (Salta, Jujuy, Tartagal, Las Lajitas).
2. An audit must have a valid area.
3. The date must be a valid string format.
4. Score must be between 0 and 100.
5. Items must be non-empty for completed audits.

## The "Dirty Dozen" Payloads (Selection)
1. **Identity Spoofing**: Attempt to create an audit with a future timestamp.
2. **State Shortcutting**: Attempt to mark an audit as completed without any items.
3. **Resource Poisoning**: Injection of 1MB string in `advisor` field.
4. **Invalid Branch**: Saving an audit for a branch that doesn't exist (e.g., "Miami").
5. **Modification of Immutable Fields**: Changing a `createdAt` value after creation.

## Phase 0: Validation & Rules Logic
The rules will enforce:
- Authenticated access.
- Schema validation for the `Audit` entity.
- Immutability of key fields on update.
- Type integrity for scores.
