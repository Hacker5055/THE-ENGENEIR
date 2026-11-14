# Firestore Security Specification

## 1. Data Invariants
1. **Identity Integrity**: Every document under `/users/{userId}/...` must carry `uid == request.auth.uid == userId` on creation, and `uid` is immutable on update.
2. **PII Isolation (Split Collection)**: Email addresses and login metadata live exclusively under `/users/{userId}/private/info` and are readable/writable only by the verified owner (`request.auth.uid == userId`) or a verified admin (`isAdmin()`).
3. **No Self-Assigned Privileges**: Non-admin users may only create `/users/{userId}/public/profile` with `role == 'STUDENT'`, and cannot modify `role` or `institutionId` on update.
4. **Immutable Audit Trail**: Entries under `/users/{userId}/activity/{activityId}` are append-only (`allow update, delete: if false` for non-admins).
5. **Temporal Integrity**: All `createdAt`, `updatedAt`, and `lastLoginAt` fields must equal `request.time` at write time; `createdAt` is immutable on update.
6. **Verified Email Mandate**: Every read/write requires `request.auth != null && request.auth.token.email_verified == true`.
7. **Strict Key & Boundary Validation**: Every write checks exact `keys().hasAll(...)` + `keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, and enforces `.size()` limits on all strings.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing (Create)**: User A writes `/users/userB/public/profile` with `uid: "userB"`. -> `PERMISSION_DENIED`.
2. **UID Hijack Inside Payload**: User A writes `/users/userA/notes/n1` with `uid: "userB"`. -> `PERMISSION_DENIED`.
3. **Privilege Escalation on Signup**: Regular user creates `/users/userA/public/profile` with `role: "SUPER_ADMIN"`. -> `PERMISSION_DENIED`.
4. **Privilege Escalation on Update**: Regular user updates `/users/userA/public/profile` changing `role` to `"INSTITUTION_ADMIN"`. -> `PERMISSION_DENIED`.
5. **Shadow Field Injection**: User A creates `/users/userA/notes/n1` including `{ isAdmin: true }` or `{ verified: true }`. -> `PERMISSION_DENIED`.
6. **Unverified Email Spoofing**: User with `email: "mz0970mmz@gmail.com"` and `email_verified: false` attempts admin read/write. -> `PERMISSION_DENIED`.
7. **PII Blanket Read**: Signed-in User A tries `get(/users/userB/private/info)`. -> `PERMISSION_DENIED`.
8. **Unauthorized List Scraping**: Signed-in User A tries `list(/users/userB/notes)`. -> `PERMISSION_DENIED`.
9. **Resource / ID Poisoning**: User A writes `/users/userA/notes/${"x".repeat(500)}` or `content` > 2000 chars. -> `PERMISSION_DENIED`.
10. **Fake Client Timestamp**: User A writes `createdAt: new Date("2099-01-01")` instead of `serverTimestamp()`. -> `PERMISSION_DENIED`.
11. **CreatedAt Mutation**: User A updates `/users/userA/notes/n1` and mutates `createdAt`. -> `PERMISSION_DENIED`.
12. **Audit Log Tampering**: User A tries to `update` or `delete` `/users/userA/activity/act1`. -> `PERMISSION_DENIED`.
