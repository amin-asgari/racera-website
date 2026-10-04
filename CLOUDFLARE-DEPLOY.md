# راهنمای انتشار سایت و Web App ریـسرا

این نسخه با معماری زیر آماده شده است:

- سایت اصلی و فایل‌های Web App روی **Cloudflare Pages** و دامنه‌ی `racera.online` منتشر می‌شوند.
- Web App در `https://racera.online/web-app/` قرار دارد.
- فایل Android در یک **GitHub Release عمومی** نگهداری می‌شود و آدرس `https://racera.online/download/android` همیشه آخرین APK را دانلود می‌کند.
- آدرس قدیمی iOS یعنی `https://racera.online/download/ios` کاربر را به Web App و راهنمای Add to Home Screen می‌برد.
- API رأی‌گیری و Web Push در همان Cloudflare Worker فعلی اجرا می‌شوند.
- Worker مستقل `racera-cdn` روی `cdn.racera.online` بدون تغییر باقی می‌ماند و Web App داده‌های مسابقات را مستقیماً از آن دریافت می‌کند.

> iOS دکمه‌ی سیستمی نصب PWA را مستقیماً در اختیار سایت نمی‌گذارد. به همین دلیل در Safari راهنمای `Share > More > Add to Home Screen` نشان داده می‌شود. در Chrome و مرورگرهای پشتیبان، دکمه‌ی واقعی نصب نمایش داده می‌شود.

## دو Worker مستقل را با هم جایگزین نکن

پروژه دو Cloudflare Worker جدا دارد:

| پوشه/نام Worker | وظیفه | Binding | وضعیت انتشار |
| --- | --- | --- | --- |
| `racera-cdn` | ارائه‌ی مستقیم داده‌های مسابقات روی `cdn.racera.online` | `RACERA_KV` | بدون تغییر نگه دار |
| `cloudflare-vote-api` / `racera-vote-api` | رأی‌گیری، Web Push و زمان‌بندی Notification | `DB` از نوع D1 | نسخه‌ی این بسته را Deploy کن |

هیچ‌یک از فایل‌های پوشه‌ی `cloudflare-vote-api` را داخل پروژه‌ی `racera-cdn` کپی نکن. فرمان‌های migration، VAPID و `npm run deploy` این راهنما فقط باید از داخل پوشه‌ی `cloudflare-vote-api` اجرا شوند. Web App داده‌های مسابقات را مستقیماً از `https://cdn.racera.online/` می‌خواند و Worker رأی‌گیری نقش CDN proxy ندارد.

## 1. پیش‌نیازهای یک‌باره

روی سیستم توسعه این موارد را داشته باش:

- Flutter همان نسخه‌ای که پروژه با آن ساخته شده است
- Node.js و pnpm
- حساب Cloudflare متصل به دامنه‌ی `racera.online`
- یک Repository عمومی GitHub برای Releaseهای Android

داخل پوشه‌ی سایت اجرا کن:

```powershell
pnpm install
```

داخل پوشه‌ی `cloudflare-vote-api` اجرا کن:

```powershell
npm install
npx wrangler login
```

## 2. آماده‌سازی Web Push در `cloudflare-vote-api`

Web Push برای کار در حالت بسته بودن Web App به Service Worker و یک backend زمان‌بندی‌شده نیاز دارد. این پروژه هر دو قسمت را دارد.

ابتدا یک جفت VAPID بساز. این کلیدها رایگان‌اند و به کارت بانکی نیاز ندارند:

```powershell
npx web-push generate-vapid-keys
```

خروجی شامل Public Key و Private Key است. سپس از داخل پوشه‌ی `cloudflare-vote-api` این سه Secret را ثبت کن:

```powershell
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_SUBJECT
```

برای `VAPID_SUBJECT` این مقدار را وارد کن:

```text
mailto:racera.support@gmail.com
```

قبل از اجرای migration از دیتابیس آنلاین نسخه‌ی پشتیبان بگیر:

```powershell
npx wrangler d1 export racera-votes --remote --output backup-before-web-push.sql
```

سپس migrationها و Worker رأی‌گیری جدید را منتشر کن. قبل از اجرای این فرمان‌ها مطمئن شو Terminal داخل پوشه‌ی `cloudflare-vote-api` است، نه `racera-cdn`:

```powershell
npm run typecheck
npm test
npx wrangler d1 migrations apply racera-votes --remote
npm run deploy
```

بعد از Deploy این آدرس باید JSON حاوی Public Key برگرداند:

```text
https://racera-vote-api.amin-asgari-work.workers.dev/v1/push/config
```

Cron تعریف‌شده در `wrangler.jsonc` هر دقیقه Reminderهای رسیده را بررسی می‌کند. خود Worker فقط Notificationهایی را می‌فرستد که کاربر در Web App فعال کرده است.

## 3. قرار دادن Amplitude API Key

در Amplitude یک Project برای Racera بساز و **Project API Key** آن را بردار. این کلید شناسه‌ی client-side است و داخل JavaScript نهایی قابل مشاهده خواهد بود؛ این رفتار طبیعی است. هیچ Secret Key، Management API Key یا رمز حساب را داخل build قرار نده.

در PowerShell:

```powershell
$env:RACERA_AMPLITUDE_KEY = "YOUR_AMPLITUDE_PROJECT_API_KEY"
```

این مقدار فقط برای همان پنجره‌ی Terminal باقی می‌ماند. برای امنیت و جلوگیری از Commit شدن تصادفی، کلید را داخل فایل سورس ننویس.

نسخه‌ی وب این داده‌ها را برای Amplitude مشخص می‌کند:

- `app_variant = web_app`
- `web_app_version = 1.0.0`
- باز شدن Web App
- اجرا شدن در حالت standalone یا browser
- نتیجه‌ی درخواست نصب در مرورگرهای پشتیبان
- استفاده و زمان حضور در بخش‌های اصلی

تعداد دقیق افرادی که در iOS روی Add to Home Screen زده‌اند مستقیماً توسط Safari گزارش نمی‌شود. معیار قابل اتکای پیاده‌سازی‌شده، باز شدن برنامه در حالت `standalone` است؛ یعنی کاربر Web App نصب‌شده را از Home Screen اجرا کرده است.

## 4. ساخت خروجی Flutter Web

از پوشه‌ی Flutter این فرمان را اجرا کن:

```powershell
flutter pub get
flutter build web --release --pwa-strategy=none --base-href /web-app/ `
  --dart-define=VOTE_API_URL=https://racera-vote-api.amin-asgari-work.workers.dev/v1/votes `
  --dart-define=WEB_PUSH_API_URL=https://racera-vote-api.amin-asgari-work.workers.dev/v1/push `
  --dart-define=AMPLITUDE_API_KEY=$env:RACERA_AMPLITUDE_KEY
```

`--pwa-strategy=none` عمداً استفاده شده است، چون پروژه Service Worker اختصاصی `racera-sw.js` برای Push دارد و نباید با Service Worker قدیمی Flutter تداخل کند. اگر Flutter در نسخه‌ی آینده این flag را حذف کرد، باید همچنان تولید Service Worker پیش‌فرض Flutter غیرفعال نگه داشته شود.

خروجی در `build/web` ساخته می‌شود. تمام محتوای آن را داخل این مسیر سایت جایگزین کن:

```text
racera-website/public/web-app/
```

در Windows می‌توانی بعد از پاک کردن محتوای قدیمی، این فرمان را اجرا کنی:

```powershell
Copy-Item -Path "build/web/*" -Destination "PATH_TO_WEBSITE/public/web-app" -Recurse -Force
```

## 5. تنظیم دانلود مستقیم Android

یک Repository عمومی مانند `racera-releases` در GitHub بساز. سپس از پوشه‌ی سایت اجرا کن:

```powershell
pnpm downloads:configure YOUR_GITHUB_USERNAME/racera-releases
```

این فرمان Redirectهای زیر را می‌سازد:

```text
/download/android  -> آخرین Racera-Android.apk در GitHub Releases
/download/ios      -> /web-app/?install=1
```

برای هر نسخه‌ی Android:

1. یک Release جدید مثل `v1.0.1` بساز.
2. فایل را دقیقاً با نام `Racera-Android.apk` آپلود کن.
3. Release را Draft یا Pre-release نگذار و آن را به‌عنوان Latest منتشر کن.

کاربر صفحه‌ی GitHub را نمی‌بیند؛ Redirect مستقیماً دانلود Asset را آغاز می‌کند. برای عوض کردن APK نیازی به Deploy دوباره‌ی سایت نیست.

## 6. تست سایت قبل از انتشار

از پوشه‌ی سایت اجرا کن:

```powershell
pnpm lint
pnpm build
```

خروجی نهایی داخل `out/` ساخته می‌شود. این مسیرها را هم بررسی کن:

```text
out/index.html
out/web-app/index.html
out/web-app/manifest.json
out/web-app/racera-sw.js
out/_redirects
```

برای تست محلی سایت:

```powershell
pnpm dev
```

Redirectهای Cloudflare در `next dev` اجرا نمی‌شوند؛ `/download/android` را بعد از Preview یا Deploy روی Pages تست کن.

## 7. انتشار روی Cloudflare Pages

Repository سایت را Commit و Push کن. اگر Cloudflare Pages قبلاً به همان Repository متصل است، Push به branch اصلی به‌صورت خودکار Deploy جدید را آغاز می‌کند.

تنظیمات Pages باید این‌ها باشند:

- Production branch: `main`
- Framework preset: `Next.js (Static HTML Export)`
- Build command: `pnpm build`
- Build output directory: `out`
- Root directory: پوشه‌ی سایت، یا خالی اگر Repository فقط شامل سایت است

فایل buildشده‌ی `public/web-app` باید داخل Repository سایت Commit شود، چون محیط Pages فقط Next.js را می‌سازد و Flutter SDK روی آن تنظیم نشده است.

برای اتصال دامنه:

1. در Pages Project به **Custom domains** برو.
2. `racera.online` را اضافه کن.
3. در صورت نیاز `www.racera.online` را نیز اضافه و به دامنه‌ی اصلی Redirect کن.
4. منتظر بمان تا SSL و Domain روی Active قرار بگیرند.

## 8. انتشار نسخه‌های بعدی Web App

برای هر نسخه‌ی جدید Web App:

1. مقدار `version` در `pubspec.yaml` را تغییر بده.
2. متن نسخه‌ی Web App را در UI و مقدار `web_app_version` در Analytics به نسخه‌ی جدید تغییر بده.
3. فرمان Flutter build بخش 4 را با Amplitude Key اجرا کن.
4. `build/web` را جایگزین `public/web-app` کن.
5. `pnpm lint` و `pnpm build` را اجرا کن.
6. تغییرات را Commit و Push کن.

Cloudflare Pages نسخه‌ی جدید را Deploy می‌کند. به‌دلیل cache مرورگر، بهتر است شماره‌ی نسخه در هر Release افزایش پیدا کند و کاربر Web App را یک بار کاملاً ببندد و دوباره باز کند.

تغییرات فقط در UI یا Flutter نیاز به Deploy دوباره‌ی Worker ندارند. `racera-vote-api` را فقط وقتی Deploy کن که کد API، migration یا تنظیمات Push تغییر کرده باشد. `racera-cdn` تنها در صورت تغییر کد CDN خودش Deploy می‌شود و بخشی از این بسته نیست.

## 9. محدودیت‌های واقعی iOS و Notification

- Web Push روی iPhone و iPad از iOS/iPadOS 16.4 به بعد و فقط برای Web App اضافه‌شده به Home Screen پشتیبانی می‌شود.
- درخواست Permission باید در پاسخ به کلیک مستقیم کاربر انجام شود؛ Popup داخلی Racera فقط توضیح می‌دهد و دکمه‌ی Enable همان تعامل مستقیم را فراهم می‌کند.
- اگر کاربر Permission سیستمی را Deny کند، سایت اجازه ندارد آن Dialog سیستمی را خودکار دوباره باز کند. Racera حداکثر سه بار راهنما را نمایش می‌دهد، اما کاربر باید Permission را از تنظیمات سیستم/مرورگر تغییر دهد.
- Racera آیکن برنامه و Badge را برای Notification مشخص می‌کند. شکل نهایی و نمایش نام Safari/Chrome تحت کنترل سیستم‌عامل است و سایت نمی‌تواند attribution سیستم را حذف کند.
- بدون HTTPS، Web Push و نصب PWA کار نمی‌کنند. دامنه‌ی Cloudflare Pages به‌صورت پیش‌فرض HTTPS دارد.

## 10. چک‌لیست انتشار

- [ ] Worker `racera-cdn` دست‌نخورده و روی `cdn.racera.online` فعال است.
- [ ] Secretهای `racera-vote-api` ثبت شده‌اند.
- [ ] D1 backup و migration انجام شده‌اند.
- [ ] Worker `racera-vote-api` Deploy شده و `/v1/push/config` پاسخ می‌دهد.
- [ ] Flutter با Amplitude Project API Key واقعی build شده است.
- [ ] محتوای `build/web` داخل `public/web-app` قرار گرفته است.
- [ ] `pnpm lint` و `pnpm build` بدون خطا تمام شده‌اند.
- [ ] سایت روی Cloudflare Pages Deploy شده است.
- [ ] `https://racera.online/web-app/?install=1` روی iPhone و Android تست شده است.
- [ ] نصب از Home Screen، Splash، آیکن، Intro و Notification تست شده‌اند.
- [ ] لینک Android آخرین GitHub Release را مستقیم دانلود می‌کند.

## مستندات مرجع

- [Web Push در Web Appهای iOS و iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [راهنمای Add to Home Screen اپل](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios)
- [Amplitude Flutter SDK و پشتیبانی Web](https://amplitude.com/docs/sdks/analytics/flutter/flutter-sdk)
- [Cloudflare Push Notifications](https://developers.cloudflare.com/agents/communication-channels/webhooks/push-notifications/)
- [Cloudflare Pages برای Next.js Static Export](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/)
- [GitHub Releases و لینک مستقیم latest](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)
