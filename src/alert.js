/**
 * Server errors mail ops@ so a merchant's failure reaches us before their email does (Yvi Creation hit a
 * broken export three times over two days before writing, 2026-09-29 → 10-01). Railway blocks SMTP, so this
 * goes over HTTPS via Resend. No RESEND_API_KEY (local dev, tests): log only. Never throws.
 *
 * Data minimisation: the mail carries no shop, no query string, no ids and a scrubbed message — nothing that
 * identifies a merchant or a person leaves for Resend. The full context (shop, URL, raw error) goes only to
 * our own server log, under the incident id printed in the mail.
 */

import { randomUUID } from "node:crypto";

const TO = "ops@justarobot.online";
const QUIET_MS = 60 * 60 * 1000;

/** Same error, same route → one mail per hour. */
export function shouldSend(key, now, sent) {
  const last = sent.get(key);
  if (last !== undefined && now - last < QUIET_MS) return false;
  sent.set(key, now);
  return true;
}

/** React Router / Remix ErrorResponse, matched by shape so neither framework is a dependency. */
function isRouteErrorResponse(error) {
  return (
    error != null &&
    typeof error.status === "number" &&
    typeof error.statusText === "string" &&
    typeof error.internal === "boolean" &&
    "data" in error
  );
}

/** 4xx responses (bots probing /.env, expired sessions) and aborted requests are noise, not failures. */
export function isAlertWorthy(error, request) {
  if (request?.signal?.aborted) return false;
  if (isRouteErrorResponse(error)) return error.status >= 500;
  if (error instanceof Response) return error.status >= 500;
  return true;
}

/** Text that may name a person or a shop: e-mail addresses, shop domains, URLs, long numbers, uuids. */
export function scrub(text) {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "<email>")
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/\b[\w-]+\.myshopify\.com\b/gi, "<shop>")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<id>")
    .replace(/\d{4,}/g, "<n>");
}

/** "/app/orders/12345" → "/app/orders/:id": the route, not the record. */
export function routeOf(pathname) {
  return pathname
    .split("/")
    .map((s) => (/\d{3,}|@|^[0-9a-f-]{16,}$/i.test(s) ? ":id" : s))
    .join("/");
}

/** The path of a request URL — also of one too broken for `new URL()`, which is often why we're alerting. */
function pathOf(url) {
  try {
    return new URL(url, "http://localhost").pathname;
  } catch {
    return String(url).split("?")[0];
  }
}

/** Only the "at …" lines: code locations, never data. */
function frames(error) {
  return error instanceof Error && error.stack
    ? error.stack.split("\n").filter((l) => /^\s+at /.test(l)).slice(0, 12).join("\n")
    : "";
}

/**
 * One alerter per app. `request` may be a Fetch Request or a node:http IncomingMessage (relative url).
 */
export function createAlerter({ app }) {
  const from = `Alerts ${app} <support+alerts@justarobot.online>`;
  const lastSent = new Map();

  return async function alertOps(error, context = {}) {
    try {
      if (!isAlertWorthy(error, context.request)) return;
      const message = scrub(error instanceof Error ? error.message : String(error));
      const req = context.request;
      const route = req ? `${req.method} ${routeOf(pathOf(req.url))}` : "-";
      if (!shouldSend(`${route} ${message}`, Date.now(), lastSent)) return;
      const incident = randomUUID().slice(0, 8);
      // Full context stays in our own log, findable by the incident id.
      console.error(`[alert ${incident}] shop=${context.shop ?? "-"} url=${req?.url ?? "-"}`, error);
      const key = process.env.RESEND_API_KEY;
      if (!key) return;
      const text = [
        `App: ${app}`,
        `Incident: ${incident} (details in the server log)`,
        `Route: ${route}`,
        `Time: ${new Date().toISOString()}`,
        "",
        message,
        frames(error),
      ].join("\n");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [TO], subject: `[${app}] ${message.slice(0, 120)}`, text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) console.error(`[alert] Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    } catch (e) {
      console.error("[alert] failed:", e);
    }
  };
}
