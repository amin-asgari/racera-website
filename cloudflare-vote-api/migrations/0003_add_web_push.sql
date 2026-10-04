CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  manage_token_hash TEXT NOT NULL,
  timezone TEXT NOT NULL,
  locale TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS push_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT NOT NULL,
  trigger_at_epoch_ms INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tag TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS push_notifications_due_idx
  ON push_notifications (sent_at, trigger_at_epoch_ms);

CREATE INDEX IF NOT EXISTS push_notifications_subscription_idx
  ON push_notifications (subscription_id, sent_at);
