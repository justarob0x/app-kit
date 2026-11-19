import assert from "node:assert/strict";
import { test } from "node:test";

import { siblings } from "../src/siblings.js";

const ids = (options) => siblings(options).map((a) => a.id);

test("a German Shopify shop sees the other EU apps, not itself and not the Austrian one", () => {
  assert.deepEqual(ids({ app: "lucid-report" }), ["eu-compliance-kit", "datev-export"]);
});

test("an Austrian shop gets BMD-Export instead of DATEV", () => {
  assert.deepEqual(ids({ app: "lucid-report", country: "AT" }), ["eu-compliance-kit", "bmd-export"]);
});

test("an app without a store listing shows the others but is not shown", () => {
  assert.deepEqual(ids({ app: "oss-report" }), ["eu-compliance-kit", "datev-export", "lucid-report"]);
  assert.ok(!ids({ app: "datev-export" }).includes("oss-report"));
});

test("on Wix every app links to the Wix App Market and carries its Wix listing name", () => {
  const list = siblings({ app: "eu-compliance-kit", platform: "wix" });
  assert.deepEqual(list.map((a) => a.id), ["datev-export", "lucid-report", "oss-report"]);
  for (const a of list) assert.ok(a.url.startsWith("https://www.wix.com/app-market/"), a.id);
  assert.equal(list[1].name, "LUCID Report");
  assert.equal(siblings({ app: "eu-compliance-kit" })[1].name, "LUCID Verpackungsgesetz Report");
  assert.deepEqual(ids({ app: "eu-compliance-kit", platform: "wix", country: "AT" }), ["bmd-export", "lucid-report", "oss-report"]);
});

test("OSS Report is not offered inside the apps that produce the OSS return themselves", () => {
  assert.deepEqual(ids({ app: "datev-export", platform: "wix" }), ["eu-compliance-kit", "lucid-report"]);
  assert.deepEqual(ids({ app: "bmd-export", platform: "wix", country: "AT" }), ["eu-compliance-kit", "lucid-report"]);
  assert.deepEqual(ids({ app: "oss-report", platform: "wix" }), ["eu-compliance-kit", "datev-export", "lucid-report"]);
  assert.deepEqual(ids({ app: "lucid-report", platform: "wix" }), ["eu-compliance-kit", "datev-export", "oss-report"]);
});

test("the meat app and the EU apps do not advertise each other", () => {
  assert.deepEqual(ids({ app: "cutsheetpro" }), []);
  assert.ok(!ids({ app: "eu-compliance-kit" }).includes("cutsheetpro"));
});

test("text follows the language and every shown app has text and an https store link", () => {
  assert.match(siblings({ app: "lucid-report", lang: "de" })[1].text, /Steuerberater/);
  assert.match(siblings({ app: "lucid-report", lang: "en" })[1].text, /tax advisor/);
  for (const app of ["eu-compliance-kit", "datev-export", "bmd-export", "lucid-report", "oss-report"]) {
    for (const lang of ["de", "en"]) {
      for (const country of ["DE", "AT"]) {
        for (const a of siblings({ app, lang, country })) {
          assert.ok(a.text.length > 10, `${a.id} ${lang}`);
          assert.match(a.url, /^https:\/\/apps\.shopify\.com\//);
        }
        for (const a of siblings({ app, lang, country, platform: "wix" })) assert.ok(a.text.length > 10, `${a.id} ${lang} wix`);
      }
    }
  }
});

test("an unknown app id throws", () => {
  assert.throws(() => siblings({ app: "lucid" }), /unknown app/);
});
