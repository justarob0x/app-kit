/**
 * A malformed `host` param (e.g. digit-only) passes the Shopify library's base64 check and then makes
 * sanitizeHost's `new URL()` throw TypeError ERR_INVALID_URL — a client error, not a 500 (which also mails
 * an ops alert). Shopify's review tooling sends such requests (datev-export 4 Oct, eu-compliance-kit and
 * epr-report 6 Oct 2026). Everything else, including Shopify's thrown redirects/Responses, is rethrown unchanged.
 *
 * Usage: export const authenticate = { ...shopify.authenticate, admin: guardHost(shopify.authenticate.admin) };
 */
export function guardHost(authenticateAdmin) {
  return async (request) => {
    try {
      return await authenticateAdmin(request);
    } catch (error) {
      if (error instanceof TypeError && error.code === "ERR_INVALID_URL") {
        throw new Response("Bad Request", { status: 400 });
      }
      throw error;
    }
  };
}
