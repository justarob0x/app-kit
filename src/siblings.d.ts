export type AppId = "eu-compliance-kit" | "datev-export" | "bmd-export" | "lucid-report" | "oss-report" | "cutsheetpro";

export interface Sibling {
  id: AppId;
  name: string;
  /** The app's listing on the asking platform's store. */
  url: string;
  text: string;
}

export function siblings(options: {
  app: AppId;
  platform?: "shopify" | "wix";
  lang?: "de" | "en";
  /** ISO country of the shop; default "DE". */
  country?: string;
}): Sibling[];
