# Racera Vote API and Web Push Worker

این پروژه Worker مستقل `racera-vote-api` است و نباید جایگزین Worker دیگری با نام `racera-cdn` شود.

- `racera-cdn`: داده‌های مسابقات را از Workers KV روی `cdn.racera.online` ارائه می‌کند.
- `racera-vote-api`: رأی کاربران، Subscriptionهای Web Push و زمان‌بندی Notification را در D1 نگه می‌دارد.

مسیرهای Worker:

- `GET /health`
- `POST /v1/votes`
- `GET /v1/push/config`
- `POST /v1/push/subscriptions`
- `PUT /v1/push/schedule`

این Worker هیچ CDN proxy ندارد. Flutter Web داده‌های مسابقات را مستقیماً از `https://cdn.racera.online/` دریافت می‌کند.

قبل از Deploy، از D1 نسخه‌ی پشتیبان بگیر و سپس طبق `CLOUDFLARE-DEPLOY.md` موجود در پروژه‌ی سایت، VAPID secrets و migrationها را اعمال کن.
