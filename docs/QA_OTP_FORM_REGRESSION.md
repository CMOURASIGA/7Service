# QA OTP | Regression guard (31/10/2026)

## Incident
The password-reset page rejected a valid eight-digit OTP before contacting Supabase. Root cause: doubled backslash characters in JavaScript regular-expression literals in `set-password-form.tsx`, which made a valid e-mail fail local validation.

## Correction
The form now calls `isValidEmailOtp` from `src/lib/auth/email-otp-validation.ts`. Automated tests cover six- and eight-digit tokens and negative paths. OTP verification and password update remain in Supabase Auth.

## Human validation
1. Verify CI, build and deployed develop SHA before retrying.
2. Request a **new** reset OTP for the existing QA user. Previously shown/exposed tokens must not be reused.
3. Verify one valid eight-digit code reaches Supabase verification, then define password and log in.
4. Confirm the QA account cannot access internal 7Service administration.
5. Do not include screenshots of OTP values, passwords, cookies or URLs containing tokens in evidence.

If code verification fails, record status/error code without exposing secrets.
