-- Cloudflare R2 metadata; object bytes remain private in R2.
CREATE TABLE IF NOT EXISTS public.media_assets (
 id UUID PRIMARY KEY,
 object_key TEXT NOT NULL UNIQUE,
 content_type TEXT NOT NULL CHECK (content_type IN ('audio/mpeg','audio/mp4','audio/wav','image/jpeg','image/png','image/webp')),
 original_name TEXT NOT NULL CHECK (char_length(original_name)<=200),
 bytes INTEGER NOT NULL CHECK (bytes>=1 AND bytes<=3000000),
 access TEXT NOT NULL DEFAULT 'free' CHECK (access IN ('free','premium')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 uploaded_by UUID REFERENCES app_auth.users(id) ON DELETE SET NULL
);
