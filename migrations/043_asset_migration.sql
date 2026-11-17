-- Asset migration: copy test audio/images from third-party hosts into our R2 bucket and remember where each copy came from.
-- Listening audio is much larger than the old 3 MB upload cap, so the size and type checks are widened.
ALTER TABLE public.media_assets DROP CONSTRAINT IF EXISTS media_assets_bytes_check;
ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_bytes_check CHECK (bytes >= 1 AND bytes <= 200000000);
ALTER TABLE public.media_assets DROP CONSTRAINT IF EXISTS media_assets_content_type_check;
ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_content_type_check CHECK (content_type IN ('audio/mpeg','audio/mp4','audio/wav','image/jpeg','image/png','image/webp','image/gif'));
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS sha256 TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'upload';
CREATE UNIQUE INDEX IF NOT EXISTS media_assets_sha256_key ON public.media_assets (sha256) WHERE sha256 IS NOT NULL;

-- One row per external URL that was copied. Several URLs with identical bytes share one asset.
-- Inline base64 images are recorded as "inline:sha256:<hex>" instead of the whole data URL.
CREATE TABLE IF NOT EXISTS public.media_asset_sources (
  source_url TEXT PRIMARY KEY CHECK (char_length(source_url) BETWEEN 8 AND 2000),
  asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  migrated_by UUID REFERENCES app_auth.users(id) ON DELETE SET NULL,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replaced JSONB NOT NULL DEFAULT '{}'::jsonb,
  rewritten_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS media_asset_sources_asset_idx ON public.media_asset_sources (asset_id);
GRANT SELECT, INSERT, UPDATE ON public.media_asset_sources TO luma_auth_runtime;
