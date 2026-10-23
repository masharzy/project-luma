# Custom authentication security

## Implemented controls

- Own Node.js auth handlers; no hosted authentication SDK or auth framework.
- Passwords use salted scrypt with N=131072, r=8, p=1 and constant-time key comparison. Unknown accounts take the same password-derivation path. Password length is 12–128 characters, bounded in UTF-8 bytes.
- Verification requires the emailed one-time token plus the signup password. Unverified or banned accounts cannot establish a session.
- Opaque 256-bit session/reset/verification tokens are stored as SHA-256 hashes. Sessions use host-only HttpOnly/Secure/SameSite=Lax cookies on HTTPS, with a seven-day absolute expiry and 24-hour idle expiry.
- Roles, bans and session versions are read from PostgreSQL on every protected server request. Password reset increments the version and revokes all sessions. Profile input cannot change roles or email.
- The runtime database role has column-level grants that deny role promotion. Owner credentials are used only for explicit schema/identity migrations, never by the app.
- State-changing endpoints enforce a canonical Origin, reject cross-site requests, require JSON and cap streamed bodies at 8 KB. Distributed fixed-window rate limits use atomic PostgreSQL counters rather than process memory.
- Reset/verification token consumption and user updates are atomic SQL operations. GET links never consume tokens or reset passwords.
- Google uses authorization code + PKCE S256, state cookie binding, a single-use server-side flow, nonce, verified email and signed ID-token claim checks. The stable Google subject identifies the user. Existing email accounts are never automatically linked to a new subject. Provider access/refresh tokens are not retained.
- Authentication replies and private pages are no-store. HTML uses a fresh CSP nonce; auth pages use no-referrer. Frame embedding and unsafe production inline scripts are disallowed.
- Success audit events contain user IDs/actions, no passwords, raw tokens, authorization codes, Google secrets or full request bodies.

## Operational boundaries

- Google production credentials and SMTP sender configuration are still required before cutover. No shared Neon service is a fallback.
- Test users and captured mail belong only to the disposable validation branch/local SMTP server. Production identities are not modified by tests.
- Expiry is enforced on every access. Periodic deletion of expired sessions/tokens/flow/rate rows and an audit-retention policy must be configured operationally; expired rows do not authorize requests.
- Production Google consent, SMTP delivery, backup/restore and owner recovery must be verified with controlled accounts. No external penetration-test claim is made.
- Existing content/admin pages still do not implement content CRUD, exam scheduling, payments or real result publication. Their future APIs need their own authorization and validation.

## Source references

- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Google OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
