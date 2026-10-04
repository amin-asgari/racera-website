# راهنمای اجرا و دیپلوی Racera Next.js

این پروژه شامل وب‌سایت اصلی و وب‌اپ جدید Next.js در مسیر `/web-app/` است. خروجی Flutter Web قدیمی در این پروژه وجود ندارد.

## ۱. متغیرهای محیطی

برای اجرای محلی، فایل `.env.example` را با نام `.env.local` کپی کنید:

```powershell
Copy-Item .env.example .env.local
```

مقادیر:

```dotenv
NEXT_PUBLIC_RACERA_CDN_URL=https://cdn.racera.online
NEXT_PUBLIC_VOTE_API_URL=https://racera-vote-api.amin-asgari-work.workers.dev/v1/votes
NEXT_PUBLIC_WEB_PUSH_API_URL=https://racera-vote-api.amin-asgari-work.workers.dev/v1/push
NEXT_PUBLIC_AMPLITUDE_API_KEY=YOUR_AMPLITUDE_API_KEY
```

- لینک Vote در `NEXT_PUBLIC_VOTE_API_URL` قرار می‌گیرد.
- کلید Amplitude در `NEXT_PUBLIC_AMPLITUDE_API_KEY` قرار می‌گیرد.
- مقدارهای `NEXT_PUBLIC_*` هنگام Build داخل فایل‌های فرانت قرار می‌گیرند؛ اطلاعات محرمانه را هرگز در آن‌ها ننویسید و بعد از تغییرشان دوباره Build/Deploy کنید.
- خالی گذاشتن Amplitude باعث خطا یا توقف برنامه نمی‌شود؛ Analytics به‌صورت اختیاری و fail-safe پیاده شده است.

## ۲. اجرای محلی و Build

نسخه پیشنهادی Node.js برابر 22 و package manager پروژه pnpm 11 است.

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm build
```

خروجی استاتیک production داخل پوشه `out` ساخته می‌شود. برای توسعه:

```powershell
pnpm dev
```

سپس `http://localhost:3000/web-app/` را باز کنید.

## ۳. دیپلوی پیشنهادی روی Cloudflare Pages

اگر Cloudflare Pages از قبل به repository گیت‌هاب وصل است، لازم نیست برای هر انتشار این دستورها را روی کامپیوتر خودتان اجرا کنید. کافی است محتوای این پروژه را commit و push کنید؛ Cloudflare با هر push، Build command زیر را خودش اجرا و پوشه `out` را منتشر می‌کند. اجرای `pnpm lint` و `pnpm build` در سیستم شخصی فقط برای تست قبل از push است.

در تنظیمات Pages این مقادیر را بگذارید:

- Root directory: ریشه همین پروژه
- Build command: `pnpm install --frozen-lockfile && pnpm build`
- Build output directory: `out`
- Environment variable: `NODE_VERSION=22`
- Environment variable: `PNPM_VERSION=11.19.0`
- چهار متغیر بخش اول را در Production و Preview اضافه کنید.

دامنه `racera.online` را به همین Pages project متصل کنید. Worker رأی فعلی CORS را برای `racera.online`، `www.racera.online`، زیردامنه‌های `pages.dev` و localhost مجاز کرده است. اگر دامنه‌ی Preview دیگری دارید، تابع `isAllowedOrigin` در `cloudflare-vote-api/src/index.ts` را نیز به‌روزرسانی کنید.

برای Vercel نیز Framework را Next.js، Build command را `pnpm build` و Output directory را `out` بگذارید. چون پروژه `output: "export"` دارد، به Node server در production نیاز نیست.

## ۴. VAPID و Web Push

کلیدهای VAPID به Next.js تعلق ندارند. هر دو کلید فقط باید روی Worker مستقل `cloudflare-vote-api` قرار بگیرند. کلید Private را هرگز در `.env.local`، Git یا متغیر `NEXT_PUBLIC_*` قرار ندهید.

```powershell
Set-Location cloudflare-vote-api
npm ci
npx wrangler login
npx wrangler d1 migrations apply racera-votes --remote
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_SUBJECT
npm run deploy
```

برای `VAPID_SUBJECT` یک contact معتبر مثل `mailto:racera.support@gmail.com` وارد کنید. فرانت کلید عمومی را از `GET /v1/push/config` می‌گیرد؛ بنابراین نیازی به کپی Public Key در Next.js نیست.

بعد از دیپلوی Worker این مسیرها باید پاسخ بدهند:

- `GET /health`
- `POST /v1/votes`
- `GET /v1/push/config`
- `POST /v1/push/subscriptions`
- `PUT /v1/push/schedule`

Cron یک‌دقیقه‌ای Worker در `cloudflare-vote-api/wrangler.jsonc` برای ارسال Reminderها فعال است.

## ۵. جایگزینی نسخه Flutter Web

اگر این پروژه را روی repository قبلی کپی می‌کنید، خروجی‌های Flutter زیر را نگه ندارید:

- `public/web-app/main.dart.js`
- `public/web-app/flutter.js`
- `public/web-app/flutter_bootstrap.js`
- `public/web-app/flutter_service_worker.js`
- `public/web-app/canvaskit/`

امن‌ترین روش این است که سورس همین فایل ZIP را جایگزین پروژه قبلی کنید و پوشه `out` را دوباره با `pnpm build` بسازید. پوشه `out` را داخل `public/web-app` کپی نکنید.

## ۶. Assets و آیکون iOS

آیکون‌های 180، 192، 512، maskable و badge از `public/assets/icons/app_icon.png` ساخته شده‌اند. Manifest و metadata نیز مستقیماً همین آیکون‌ها را معرفی می‌کنند؛ در iOS باید Safari cache یا Home Screen shortcut قدیمی را پاک و دوباره Add to Home Screen کنید تا آیکون جدید دیده شود.

وب‌اپ فایل‌های اصلی PNG و SVG را مستقیماً از `public/assets` مصرف می‌کند. هیچ‌کدام از assetهای محتوایی در زمان Build تبدیل، فشرده یا حذف نمی‌شوند. اگر `app_icon.png` را عوض کردید، فقط مشتق‌های آیکون PWA را با دستور زیر دوباره بسازید:

```powershell
pnpm optimize:assets
```

این دستور فقط آیکون‌های PWA را تولید می‌کند و به فایل‌های اصلی PNG/SVG دست نمی‌زند.

## ۷. نکات تست بعد از دیپلوی

1. `/web-app/` را در پنجره Private باز کنید و Intro را کامل کنید.
2. Home، Calendar، Standings و یک پروفایل Driver/Constructor را باز کنید.
3. در Settings > About لینک‌های سایت، Privacy و Terms را تست کنید.
4. رأی واقعی را فقط یک‌بار از یک installation آزمایشی ثبت کنید؛ Worker براساس installation ID رأی را قفل می‌کند.
5. Web Push روی iPhone/iPad فقط پس از Add to Home Screen در دسترس است.
6. در Amplitude رویدادهای `Web App Opened`، `Section Time Spent`، `Home Scroll Activity`، `Profile Engagement Summary`، `Settings Section Opened`، `Support Tapped` و رویدادهای Permission را بررسی کنید.
