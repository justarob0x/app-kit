// The company's other apps, for the "our other apps" section inside each app.
// One list, so a new listing or a changed URL is edited once.
//
// Store rules this list is built around:
// - Wix: promote only your own Wix apps, in a section of their own, and link only to Wix App Market listings.
// - Shopify: not in admin blocks, admin actions, checkout or theme extensions. The app's own pages are fine.
// So an app without a listing on the asking platform is left out.

const APPS = [
  {
    id: "eu-compliance-kit",
    group: "eu",
    name: "EU Compliance Kit",
    shopify: "https://apps.shopify.com/eu-compliance-kit-1",
    wix: "https://www.wix.com/app-market/universal-exporters-llc-eu-compliance-kit",
    text: {
      de: "Widerrufsbutton, GPSR-Produktsicherheit, Omnibus-Vorpreis und mehr für EU-Shops.",
      en: "Withdrawal button, GPSR product safety, Omnibus prior price and more for EU shops.",
    },
  },
  {
    id: "datev-export",
    group: "eu",
    countries: ["DE"],
    name: "Export für DATEV",
    shopify: "https://apps.shopify.com/datev-export",
    wix: "https://www.wix.com/app-market/universal-exporters-llc-export-f%C3%BCr-datev",
    text: {
      de: "Bestellungen als DATEV-Buchungsstapel für den Steuerberater.",
      en: "Orders as a DATEV booking batch for your tax advisor.",
    },
  },
  {
    id: "bmd-export",
    group: "eu",
    countries: ["AT"],
    name: "BMD-Export",
    shopify: "https://apps.shopify.com/bmd-export-2",
    text: {
      de: "Bestellungen als Buchungsdatei für BMD NTCS oder RZL.",
      en: "Orders as a booking file for BMD NTCS or RZL.",
    },
  },
  {
    id: "lucid-report",
    group: "eu",
    countries: ["DE", "AT"],
    name: "LUCID Verpackungsgesetz Report",
    shopify: "https://apps.shopify.com/lucid-verpackungsgesetz-report",
    text: {
      de: "Verpackungsmengen je Material aus den versendeten Bestellungen, für die LUCID-Datenmeldung.",
      en: "Packaging quantities per material from shipped orders, for the LUCID data report.",
    },
  },
  // No store listing yet: it can show the others, the others do not show it.
  { id: "oss-report", group: "eu", countries: ["DE"], name: "OSS Report", text: { de: "", en: "" } },
  {
    id: "cutsheetpro",
    group: "meat",
    name: "CutSheetPro",
    shopify: "https://apps.shopify.com/cutsheetpro",
    text: {
      de: "Fleischanteile mit Anzahlung, Zerlegeliste und Abrechnung nach Schlachtgewicht.",
      en: "Deposits, cut sheets and hanging-weight balances for meat shares.",
    },
  },
];

/**
 * The other apps worth showing inside `app`: same audience, listed on `platform`, sold in `country`.
 * An unknown `app` throws, so a typo fails in the app's tests instead of showing an empty section.
 */
export function siblings({ app, platform = "shopify", lang = "de", country = "DE" }) {
  const self = APPS.find((a) => a.id === app);
  if (!self) throw new Error(`app-kit/siblings: unknown app "${app}"`);
  return APPS.filter(
    (a) => a.id !== app && a.group === self.group && a[platform] && (!a.countries || a.countries.includes(country)),
  ).map((a) => ({ id: a.id, name: a.name, url: a[platform], text: a.text[lang] ?? a.text.en }));
}
