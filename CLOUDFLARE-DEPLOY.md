# راهنمای کامل انتشار Racera

معماری نهایی پروژه:

- سایت روی **Cloudflare Pages** قرار می‌گیرد.
- فایل‌های APK و IPA به‌عنوان Asset در **GitHub Releases** قرار می‌گیرند.
- کاربر فقط URLهای `racera.online` را می‌بیند و با کلیک روی دکمه، دانلود مستقیم آغاز می‌شود.
- هر Release جدید به‌صورت خودکار جای نسخه‌ی قبلی را در لینک دانلود می‌گیرد؛ سایت نیازی به Build یا Deploy مجدد ندارد.

## 1. ساخت Repository مخصوص فایل‌های برنامه

1. وارد GitHub شو و **New repository** را بزن.
2. نام پیشنهادی را `racera-releases` بگذار.
3. Repository را حتماً **Public** انتخاب کن تا دانلود کاربران به Login نیاز نداشته باشد.
4. گزینه‌ی ساخت `README` را فعال کن و Repository را بساز.

سورس اپ یا سایت لازم نیست در این Repository قرار بگیرد. این Repository فقط محل Releaseهای عمومی برنامه است.

## 2. اتصال یک‌باره‌ی سایت به Repository انتشار

در پوشه‌ی پروژه‌ی سایت، به‌جای `YOUR_GITHUB_USERNAME` نام کاربری یا Organization واقعی GitHub را وارد کن:

```bash
pnpm downloads:configure YOUR_GITHUB_USERNAME/racera-releases
```

این فرمان فایل `public/_redirects` را تولید می‌کند. نتیجه باید مشابه زیر باشد:

```text
/download/android https://github.com/YOUR_GITHUB_USERNAME/racera-releases/releases/latest/download/Racera-Android.apk 302
/download/ios https://github.com/YOUR_GITHUB_USERNAME/racera-releases/releases/latest/download/Racera-iOS.ipa 302
```

این کار فقط یک‌بار انجام می‌شود. بعد از آن نام Repository یا نام فایل‌ها را تغییر نده.

## 3. ساخت اولین GitHub Release

1. وارد Repository `racera-releases` شو.
2. بخش **Releases** را باز کن و **Draft a new release** را بزن.
3. یک Tag مانند `v1.0.0` ایجاد کن.
4. عنوان Release را مثلاً `Racera 1.0.0` بگذار.
5. فایل Android را دقیقاً با نام `Racera-Android.apk` آپلود کن.
6. فایل iOS را دقیقاً با نام `Racera-iOS.ipa` آپلود کن.
7. بهتر است `Racera-Android.apk.sha256` و `Racera-iOS.ipa.sha256` را نیز قرار بدهی.
8. Version، تاریخ، تغییرات و راهنمای نصب iOS را در Release notes بنویس.
9. Release را Pre-release نکن و گزینه‌ی **Set as latest release** را فعال نگه دار.
10. **Publish release** را بزن.

تا قبل از انتشار اولین Release، لینک‌های دانلود طبیعتاً خطای 404 می‌دهند.

## 4. چرا کاربر صفحه‌ی GitHub را نمی‌بیند؟

دکمه‌های سایت به این آدرس‌ها متصل‌اند:

- `https://racera.online/download/android`
- `https://racera.online/download/ios`

Cloudflare پاسخ `302` می‌دهد و مرورگر را مستقیماً به Asset آخرین GitHub Release می‌فرستد. مقصد از الگوی رسمی زیر استفاده می‌کند:

```text
https://github.com/OWNER/REPOSITORY/releases/latest/download/ASSET_NAME
```

بنابراین صفحه‌ی Release باز نمی‌شود؛ خود فایل دانلود می‌شود. مشاهده‌ی دامنه‌ی GitHub یا `githubusercontent.com` در Download Manager طبیعی است، چون فایل واقعاً از سرور GitHub دریافت می‌شود.

## 5. تست پروژه در سیستم خودت

```bash
pnpm install
pnpm lint
pnpm build
```

خروجی آماده‌ی انتشار در پوشه‌ی `out/` ساخته می‌شود و باید فایل `out/_redirects` نیز در آن وجود داشته باشد.

نکته: Redirectهای Cloudflare در `next dev` اجرا نمی‌شوند؛ مسیر دانلود را پس از Preview/Deploy روی Cloudflare Pages تست کن.

## 6. قرار دادن سایت در GitHub

برای سایت یک Repository جدا مانند `racera-website` بساز و داخل پوشه‌ی پروژه اجرا کن:

```bash
git init
git add .
git commit -m "Prepare Racera website for launch"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/racera-website.git
git push -u origin main
```

اگر Repository سایت قبلاً ساخته شده، فقط تغییرات را Commit و Push کن.

## 7. ساخت Cloudflare Pages Project

1. وارد Cloudflare Dashboard شو.
2. به **Workers & Pages** برو و **Create application** را بزن.
3. **Pages** و سپس **Import an existing Git repository** را انتخاب کن.
4. Repository سایت یعنی `racera-website` را انتخاب کن.
5. Production branch را `main` بگذار.
6. Framework preset را **Next.js (Static HTML Export)** قرار بده.
7. Build command را `pnpm build` بگذار.
8. Build output directory را `out` قرار بده.
9. Deploy را بزن و آدرس موقت `pages.dev` را تست کن.

## 8. اتصال دامنه racera.online

1. داخل Pages Project به **Custom domains** برو.
2. **Set up a domain** را انتخاب کن.
3. `racera.online` را وارد کن.
4. چون دامنه در همان حساب Cloudflare قرار دارد، Cloudflare رکورد DNS لازم را می‌سازد.
5. منتظر بمان تا دامنه و SSL روی **Active** قرار بگیرند.
6. در صورت نیاز `www.racera.online` را هم اضافه و به دامنه‌ی اصلی Redirect کن.

## 9. انتشار آپدیت‌های بعدی بدون تغییر سایت

برای هر نسخه‌ی جدید فقط این مراحل را انجام بده:

1. در Repository انتشار، **Draft a new release** را بزن.
2. Tag جدید مانند `v1.0.1` یا `v1.1.0` بساز.
3. APK و IPA جدید را دوباره با نام‌های ثابت `Racera-Android.apk` و `Racera-iOS.ipa` آپلود کن.
4. Changelog و checksumها را اضافه کن.
5. Release را به‌صورت عمومی و Latest منتشر کن.

از همان لحظه، لینک‌های `racera.online/download/...` نسخه‌ی جدید را تحویل می‌دهند. برای آپدیت فایل برنامه نیازی به Commit، Push یا Deploy دوباره‌ی سایت نیست.

## 10. تست نهایی دانلود

بعد از انتشار Release و Deploy سایت، در پنجره‌ی Incognito این دو URL را باز کن:

```text
https://racera.online/download/android
https://racera.online/download/ios
```

کنترل کن که:

- صفحه‌ی GitHub نمایش داده نشود.
- دانلود مستقیماً آغاز شود.
- نام فایل دانلودی درست باشد.
- فایل خراب نباشد و SHA-256 آن با مقدار Release notes تطابق داشته باشد.
- APK روی Android نصب شود.
- برای IPA توضیح روشن امضا و Sideloading وجود داشته باشد.

## نکات مهم

- Repository انتشار باید Public باشد؛ Release خصوصی برای کاربران عمومی Login می‌خواهد.
- Release نباید Draft یا Pre-release باقی بماند، چون لینک `latest` باید آن را انتخاب کند.
- نام Assetها در همه‌ی نسخه‌ها باید دقیقاً ثابت بماند.
- فایل‌های APK و IPA را داخل Git معمولی Commit نکن؛ فقط به Release پیوست کن.
- Redirect باعث می‌شود کاربر وارد صفحه‌ی GitHub نشود، اما دانلود از زیرساخت GitHub انجام می‌شود.

## مستندات رسمی

- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [لینک مستقیم به آخرین Release](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)
- [مدیریت Releaseها](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
- [Cloudflare Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/)
- [Static Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
