import { test } from "node:test";
import assert from "node:assert/strict";

import { guardHost } from "../src/host-guard.js";

function invalidUrl() {
  const error = new TypeError("Invalid URL");
  error.code = "ERR_INVALID_URL";
  return error;
}

test("ERR_INVALID_URL from authenticate.admin becomes a 400 Response", async () => {
  const admin = guardHost(async () => {
    throw invalidUrl();
  });
  await assert.rejects(admin(new Request("https://x/app?host=999")), (r) => r instanceof Response && r.status === 400);
});

test("Shopify's own thrown Responses (redirects) and other errors pass through unchanged", async () => {
  const redirect = new Response(null, { status: 302, headers: { Location: "/auth/login" } });
  await assert.rejects(guardHost(async () => { throw redirect; })(new Request("https://x/app")), (r) => r === redirect);
  const other = new TypeError("something else");
  await assert.rejects(guardHost(async () => { throw other; })(new Request("https://x/app")), (e) => e === other);
});

test("a successful login is returned as is", async () => {
  const ctx = { session: { shop: "x" } };
  assert.equal(await guardHost(async () => ctx)(new Request("https://x/app")), ctx);
});
