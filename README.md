# Racera website and Next.js web app

The official marketing website and lightweight Next.js PWA for Racera. The web app lives at `/web-app/` and includes the Formula 1 calendar, results, standings, driver/team/circuit profiles, voting, install support, and web-push reminders.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Open the web app at [http://localhost:3000/web-app/](http://localhost:3000/web-app/).

## Production checks

```bash
pnpm lint
pnpm build
```

The production build is a static export in `out/`, ready for Cloudflare Pages.

## Stable download URLs

- Android: `https://racera.online/download/android`
- iOS: `https://racera.online/download/ios`

The two URLs are Cloudflare Pages redirects to the assets attached to the latest public GitHub Release. Visitors do not land on a GitHub page: the browser follows the redirect and starts the installer download.

Configure the GitHub release repository once before deployment:

```bash
pnpm downloads:configure YOUR_GITHUB_USERNAME/racera-releases
```

Every published release must contain assets named exactly `Racera-Android.apk` and `Racera-iOS.ipa`. GitHub's `/releases/latest/download/...` URL then follows the newest non-prerelease automatically, so later app updates do not require a website rebuild.

For the complete Cloudflare Pages workflow, web-app environment variables, VAPID setup, asset optimization, and migration from Flutter Web, see [`DEPLOYMENT-FA.md`](./DEPLOYMENT-FA.md).

## Before launch

- Publish a public GitHub Release containing the signed APK and IPA with the exact stable asset names.
- Add version, size, release date, changelog, and SHA-256 checksums to its release notes.
- Include the relevant signing/sideloading instructions for iOS.
- Reviewed text for Privacy Policy, Terms of Use, App License, and Disclaimer.
- The final public domain is configured as `racera.online` in metadata, robots, and sitemap files.

Support email: `racera.support@gmail.com`

## Fonts and third-party marks

Confirm that the project has web-distribution rights for the Formula 1 and Northwell font files before public deployment. Racing-series names and marks belong to their respective owners; keep the independent-product disclaimer visible.
