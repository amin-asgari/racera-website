# Racera website

The official marketing website for Racera, a motorsport calendar, results, standings, profile, notification, and widget companion.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

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

See [`CLOUDFLARE-DEPLOY.md`](./CLOUDFLARE-DEPLOY.md) for the deployment and update workflow.

## Before launch

- Publish a public GitHub Release containing the signed APK and IPA with the exact stable asset names.
- Add version, size, release date, changelog, and SHA-256 checksums to its release notes.
- Include the relevant signing/sideloading instructions for iOS.
- Reviewed text for Privacy Policy, Terms of Use, App License, and Disclaimer.
- The final public domain is configured as `racera.online` in metadata, robots, and sitemap files.

Support email: `racera.support@gmail.com`

## Fonts and third-party marks

Confirm that the project has web-distribution rights for the Formula 1 and Northwell font files before public deployment. Racing-series names and marks belong to their respective owners; keep the independent-product disclaimer visible.
