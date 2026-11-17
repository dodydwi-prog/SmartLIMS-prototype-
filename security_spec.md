# Security Specification — SmartLIMS Firestore Rules

## 1. Data Invariants
1. **Default-Deny Catch-All**: Seluruh path yang tidak didefinisikan secara eksplisit ditolak (`allow read, write: if false;`).
2. **Identity & Email Verification**: Seluruh operasi tulis/baca data bisnis mewajibkan `request.auth != null && request.auth.token.email_verified == true`.
3. **No Self-Assigned Roles**: Pengguna standar tidak dapat menetapkan `role` selain `'customer'` saat membuat profil `/users/{userId}`, dan tidak dapat mengubah `role` saat pembaruan.
4. **Strict Tenant Isolation**: Pelanggan hanya dapat membaca (`get`, `list`) dokumen `/sampling_requests/{requestId}` milik `ownerUid == request.auth.uid`.
5. **State Machine Integrity**: Pelanggan hanya dapat membuat permohonan berstatus `'SUBMITTED'`, dan tidak dapat melompatkan status menjadi `'VERIFIED'` atau `'APPROVED'`.
6. **Immutable Audit Trail**: Dokumen di `/audit_logs/{logId}` bersifat *append-only* (`allow update, delete: if false;`).
7. **Calendar & Team Protection**: Hanya Admin terverifikasi yang dapat memodifikasi `/calendar_days` dan `/sampler_teams`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Yield `PERMISSION_DENIED`)
1. Unauthenticated read on `/sampling_requests/req-0042` (`request.auth == null`).
2. Unverified email (`email_verified: false`) attempting to create `/sampling_requests/req-99`.
3. Customer attempting to create `/users/{uid}` with `role: 'admin'` (Privilege Escalation).
4. Customer attempting to update `/users/{uid}` changing `role` from `'customer'` to `'admin'`.
5. Customer A attempting `get` or `list` on Customer B's `/sampling_requests` without `ownerUid == request.auth.uid` filter (PII / Tenant Leak).
6. Customer attempting to create `/sampling_requests/req-100` with `status: 'APPROVED'` (State Shortcutting).
7. Customer attempting to update `/sampling_requests/req-0042` with a shadow field `isVerified: true` (Shadow Update).
8. Customer attempting to update `/sampling_requests/req-0040` after terminal status `'APPROVED'`.
9. Malicious string injection > 128 chars in document ID `/sampling_requests/<200-char-id>` (`isValidId` Poisoning).
10. Client spoofing `createdAt` or `updatedAt` with arbitrary past/future timestamps instead of `request.time`.
11. Customer attempting to modify `/calendar_days/2026-11-23` capacity or lock status.
12. Any user (including Admin) attempting to `update` or `delete` `/audit_logs/log-001` (Audit Trail Tampering).
