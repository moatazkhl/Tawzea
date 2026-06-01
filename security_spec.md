# Security Spec for Entitlement System

## 1. Data Invariants
- `national_id` and `family_card` must be unique (enforced by application logic, rules can check for existing docs if we use them as IDs, but for now we use random IDs for flexibility, or we use `national_id` as document ID).
- `queue_index` must be a positive number.
- `status` must be one of: `waiting`, `active`, `delivered`.
- Admnins can read/write everything.
- Distributors can read everything and update `status` and `last_delivered_at`.
- Citizens (unauthenticated) can only read their own record by querying with `national_id`.

## 2. Dirty Dozen Payloads
1. Attempting to create a user without a national ID.
2. Attempting to update a user's `national_id` (immutable).
3. Attempting to set status to an invalid value like `hacker`.
4. Attempting to update `queue_index` as a non-admin.
5. Attempting to delete a user as a non-admin.
6. Attempting to read all users as an unauthenticated user.
7. Attempting to update the `admin_password` setting as a non-admin.
8. Attempting to create a user with a very large string (>1KB) in notes.
9. Attempting to set `last_delivered_at` to a future date manually (should use server timestamp).
10. Attempting to skip the `waiting` state directly to `delivered` if the logic requires `active` first (though currently we allow it).
11. Spoofing admin privileges by writing to the `admins` collection (if it exists).
12. Attempting to write a user record with a duplicate `national_id` (if we use it as the document ID).

## 3. Test Runner (Mock)
(Rules will be tested during final development phase)
