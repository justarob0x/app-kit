import { test } from "node:test";
import assert from "node:assert/strict";

import { createAlerter, isAlertWorthy, routeOf, scrub, shouldSend } from "../src/alert.js";

test("scrubs e-mail addresses, shop domains, URLs, uuids and long numbers from the message", () => {
  assert.equal(scrub("Bestellung 0GNHK: Unexpected German VAT rate 20 %"), "Bestellung 0GNHK: Unexpected German VAT rate 20 %");
  assert.equal(scrub("Unique constraint failed on email: info@yvicreation.de"), "Unique constraint failed on email: <email>");
  assert.equal(scrub("fetch https://kufhjz-va.myshopify.com/admin failed for kufhjz-va.myshopify.com"), "fetch <url> failed for <shop>");
  assert.equal(scrub("session 21dd01a5-1421-067f-eb43-3ea30287a323 order 1234567890"), "session <id> order <n>");
});

test("keeps the route but not the record", () => {
  assert.equal(routeOf("/app/export"), "/app/export");
  assert.equal(routeOf("/app/orders/6123456789/refund"), "/app/orders/:id/refund");
  assert.equal(routeOf("/api/customer/info@example.de"), "/api/customer/:id");
});

test("shouldSend: the first of an error, then quiet for an hour", () => {
  const sent = new Map();
  assert.equal(shouldSend("a", 0, sent), true);
  assert.equal(shouldSend("a", 59 * 60_000, sent), false);
  assert.equal(shouldSend("b", 59 * 60_000, sent), true);
  assert.equal(shouldSend("a", 61 * 60_000, sent), true);
});

test("isAlertWorthy: thrown errors and 5xx, not 4xx or aborted requests", () => {
  assert.equal(isAlertWorthy(new Error("boom")), true);
  assert.equal(isAlertWorthy(new Response(null, { status: 500 })), true);
  assert.equal(isAlertWorthy(new Response(null, { status: 404 })), false);
  // React Router / Remix ErrorResponse shape
  assert.equal(isAlertWorthy({ status: 404, statusText: "Not Found", internal: true, data: "" }), false);
  assert.equal(isAlertWorthy({ status: 503, statusText: "", internal: false, data: null }), true);
  const aborted = new AbortController();
  aborted.abort();
  assert.equal(isAlertWorthy(new Error("boom"), new Request("https://x/app", { signal: aborted.signal })), false);
});

/** Runs alertOps with a fake Resend and returns what was posted. */
async function capture(fn) {
  const posted = [];
  const realFetch = globalThis.fetch;
  const realError = console.error;
  const key = process.env.RESEND_API_KEY;
  globalThis.fetch = async (url, init) => {
    posted.push({ url, body: JSON.parse(init.body) });
    return new Response("{}", { status: 200 });
  };
  console.error = () => {};
  try {
    await fn();
  } finally {
    globalThis.fetch = realFetch;
    console.error = realError;
    if (key === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = key;
  }
  return posted;
}

test("mails a scrubbed alert with no shop and no query string", async () => {
  const posted = await capture(async () => {
    process.env.RESEND_API_KEY = "re_test";
    const alertOps = createAlerter({ app: "demo" });
    await alertOps(new Error("failed for shop-1.myshopify.com"), {
      request: new Request("https://app.example/app/orders/123456?shop=shop-1.myshopify.com"),
      shop: "shop-1.myshopify.com",
    });
  });
  assert.equal(posted.length, 1);
  const { from, to, subject, text } = posted[0].body;
  assert.equal(from, "Alerts demo <support+alerts@justarobot.online>");
  assert.deepEqual(to, ["ops@justarobot.online"]);
  assert.equal(subject, "[demo] failed for <shop>");
  assert.match(text, /Route: GET \/app\/orders\/:id/);
  assert.doesNotMatch(JSON.stringify(posted[0].body), /shop-1/);
});

test("accepts a node:http request (relative url) and stays quiet when the same error repeats", async () => {
  const posted = await capture(async () => {
    process.env.RESEND_API_KEY = "re_test";
    const alertOps = createAlerter({ app: "demo" });
    const req = { method: "POST", url: "/api/license?key=abc" };
    await alertOps(new Error("boom"), { request: req });
    await alertOps(new Error("boom"), { request: req });
  });
  assert.equal(posted.length, 1);
  assert.match(posted[0].body.text, /Route: POST \/api\/license\n/);
});

test("without RESEND_API_KEY it only logs", async () => {
  const posted = await capture(async () => {
    delete process.env.RESEND_API_KEY;
    await createAlerter({ app: "demo" })(new Error("boom"));
  });
  assert.equal(posted.length, 0);
});

test("never throws, even when the mail provider is down", async () => {
  const realFetch = globalThis.fetch;
  const realError = console.error;
  process.env.RESEND_API_KEY = "re_test";
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  console.error = () => {};
  try {
    await createAlerter({ app: "demo" })(new Error("boom"));
  } finally {
    globalThis.fetch = realFetch;
    console.error = realError;
    delete process.env.RESEND_API_KEY;
  }
});
