// Centralized admin gate. Prefer a role claim baked into the JWT, with a
// fallback env-configured email for early-days bootstrap. Avoid scattering
// string-literal email comparisons through the codebase.

const ADMIN_EMAIL_ENV = process.env.ADMIN_EMAIL;
// Legacy hardcoded admin used across the codebase before the role column
// existed. Retained as a last-resort fallback so existing prod behaviour
// doesn't regress if ADMIN_EMAIL isn't set.
const LEGACY_ADMIN_EMAIL = "gauravsingh9314@gmail.com";

function matchesAdminEmail(email) {
  if (!email) return false;
  if (ADMIN_EMAIL_ENV && typeof ADMIN_EMAIL_ENV === "string") {
    return email === ADMIN_EMAIL_ENV;
  }
  return email === LEGACY_ADMIN_EMAIL;
}

/**
 * Check admin status from a NextAuth session object (client or server).
 * Prefers the `role` claim; falls back to email match for backward compat.
 */
export function isAdminSession(session) {
  if (!session?.user) return false;
  if (session.user.role === "admin") return true;
  return matchesAdminEmail(session.user.email);
}

/**
 * Check admin status from a decoded JWT token (NextAuth jwt callback).
 */
export function isAdminToken(token) {
  if (!token) return false;
  if (token.role === "admin") return true;
  return matchesAdminEmail(token.email);
}

/**
 * Raw email-based check — prefer isAdminSession/Token wherever possible.
 */
export function isAdminEmail(email) {
  return matchesAdminEmail(email);
}
