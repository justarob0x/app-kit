# @justarobot/app-kit

Code shared by the justarobot apps, so a fix is made once instead of copied into every repo.
Plain ESM JavaScript with hand-written types: no build step and no dependencies.

| Import | What |
|---|---|
| `@justarobot/app-kit/alert` | `createAlerter({ app })` → `alertOps(error, { request?, shop? })`: server errors mail ops@ via Resend (`RESEND_API_KEY`), scrubbed, one mail per error per hour. Works with Fetch `Request` and `node:http` requests. |
| `@justarobot/app-kit/host-guard` | `guardHost(shopify.authenticate.admin)`: a malformed `host` param answers 400 instead of 500. |
| `@justarobot/app-kit/siblings` | `siblings({ app, platform?, lang?, country? })` → `[{ id, name, url, text }]`: the other apps to show inside an app. Same audience only, store-listing links only, filtered by shop country. Each app renders the list itself. |

## Install

Apps pin a tag through GitHub's tarball URL. Plain HTTPS, so Docker images need no git:

```json
"@justarobot/app-kit": "https://codeload.github.com/justarob0x/app-kit/tar.gz/refs/tags/v1.0.0"
```

## Changing it

1. Fix it here with a test (`npm test`), bump `version`, commit, then `git tag vX.Y.Z && git push --tags`.
2. In each app, bump the tag in `package.json`, `npm install`, run its tests, and deploy.

Users: datev-export, cutsheet, erechnung-sheets (server); epr-report and eu-compliance-kit after their App Store
approval.
