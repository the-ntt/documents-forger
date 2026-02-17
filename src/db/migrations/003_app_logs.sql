-- Application logs table for structured log storage
CREATE TABLE app_logs (
  id BIGSERIAL PRIMARY KEY,
  level VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_logs_timestamp ON app_logs(timestamp DESC);
CREATE INDEX idx_app_logs_level ON app_logs(level);

-- Auto-prune logs older than 7 days (can be called via cron or manually)
CREATE OR REPLACE FUNCTION prune_old_logs() RETURNS void AS $$
BEGIN
  DELETE FROM app_logs WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
