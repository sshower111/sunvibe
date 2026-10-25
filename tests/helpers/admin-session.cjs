'use strict'
/**
 * Cookie header for a signed-in admin, as the browser sends it after sign-in.
 * Admin endpoints accept only this cookie; the password works only at /api/admin/verify.
 * ADMIN_PASSWORD must be set before calling.
 */
function adminCookie(load) {
  return 'sunville_admin=' + encodeURIComponent(load('lib/admin-auth.ts').createAdminSessionToken().token)
}
module.exports = { adminCookie }
