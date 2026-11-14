/**
 * Security Rule Adversarial Payload Specification Test Suite ("Dirty Dozen")
 * Verifies every adversarial payload violates at least one invariant enforced in firestore.rules.
 */

export interface AdversarialCase {
  name: string;
  operation: "get" | "list" | "create" | "update" | "delete";
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: "PERMISSION_DENIED";
}

export const DIRTY_DOZEN_CASES: AdversarialCase[] = [
  {
    name: "1. Identity Spoofing on Create",
    operation: "create",
    path: "/users/userB/public/profile",
    auth: { uid: "userA", email: "a@example.com", email_verified: true },
    payload: { uid: "userB", displayName: "Spoof", photoURL: "", role: "STUDENT", institutionId: "inst_1" },
    expected: "PERMISSION_DENIED",
  },
  {
    name: "2. UID Hijack Inside Note Payload",
    operation: "create",
    path: "/users/userA/notes/note1",
    auth: { uid: "userA", email: "a@example.com", email_verified: true },
    payload: { uid: "userB", title: "x", content: "y", pinned: false },
    expected: "PERMISSION_DENIED",
  },
  {
    name: "3. Self-Assigned Privilege Escalation on Signup",
    operation: "create",
    path: "/users/userA/public/profile",
    auth: { uid: "userA", email: "a@example.com", email_verified: true },
    payload: { uid: "userA", displayName: "Attacker", photoURL: "", role: "SUPER_ADMIN", institutionId: "inst_1" },
    expected: "PERMISSION_DENIED",
  },
  {
    name: "4. Privilege Escalation on Update",
    operation: "update",
    path: "/users/userA/public/profile",
    auth: { uid: "userA", email: "a@example.com", email_verified: true },
    payload: { role: "INSTITUTION_ADMIN" },
    expected: "PERMISSION_DENIED",
  },
  {
    name: "5. Shadow Field Injection",
    operation: "create",
    path: "/users/userA/notes/note2",
    auth: { uid: "userA", email: "a@example.com", email_verified: true },
    payload: { uid: "userA", title: "Note", content: "Body", pinned: false, isAdmin: true },
    expected: "PERMISSION_DENIED",
  },
  {
    name: "6. Unverified Email Admin Spoofing",
    operation: "get",
    path: "/users/userB/private/info",
    auth: { uid: "spoofAdmin", email: "mz0970mmz@gmail.com", email_verified: false },
    expected: "PERMISSION_DENIED",
  },
  {
    name: "7. PII Blanket Read by Non-Owner",
    operation: "get",
    path: "/users/userB/private/info",
    auth: { uid: "userA", email: "a@example.com", email_verified: true },
    expected: "PERMISSION_DENIED",
  },
  {
    name: "8. Unauthorized List Scraping",
    operation: "list",
    path: "/users/userB/notes",
    auth: { uid: "userA", email: "a@example.com", email_verified: true },
    expected: "PERMISSION_DENIED",
  },
  {
    name: "9. Resource & ID Size Poisoning",
    operation: "create",
    path: `/users/userA/notes/${"x".repeat(200)}`,
    auth: { uid: "userA", email: "a@example.com", email_verified: true },
    payload: { uid: "userA", title: "A", content: "B".repeat(2500), pinned: false },
    expected: "PERMISSION_DENIED",
  },
  {
    name: "10. Forged Client Timestamp",
    operation: "create",
    path: "/users/userA/notes/note3",
    auth: { uid: "userA", email: "a@example.com", email_verified: true },
    payload: { uid: "userA", title: "Future", content: "Test", pinned: false, createdAt: "2099-01-01T00:00:00Z" },
    expected: "PERMISSION_DENIED",
  },
  {
    name: "11. Immutable createdAt Mutation",
    operation: "update",
    path: "/users/userA/notes/note1",
    auth: { uid: "userA", email: "a@example.com", email_verified: true },
    payload: { createdAt: "2020-01-01T00:00:00Z" },
    expected: "PERMISSION_DENIED",
  },
  {
    name: "12. Activity Audit Log Tampering",
    operation: "delete",
    path: "/users/userA/activity/act1",
    auth: { uid: "userA", email: "a@example.com", email_verified: true },
    expected: "PERMISSION_DENIED",
  },
];
