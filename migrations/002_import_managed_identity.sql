-- Abort rather than silently discard a newly created legacy password credential.
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM neon_auth.account WHERE password IS NOT NULL) THEN
  RAISE EXCEPTION 'Legacy password credentials require an explicit password migration or recovery plan';
 END IF;
END $$;
-- statement-breakpoint
-- One-time identity import. No provider tokens, password hashes or sessions are copied.
-- Existing rows in our schema are never overwritten on a rerun.
INSERT INTO app_auth.users(id,email,name,email_verified,role,banned,created_at,updated_at)
SELECT id,lower(email),left(coalesce(nullif(name,''),'Learner'),80),"emailVerified",
 CASE WHEN role='admin' AND "emailVerified"=true THEN 'admin' ELSE 'user' END,
 coalesce(banned,false),"createdAt","updatedAt"
FROM neon_auth."user"
ON CONFLICT DO NOTHING;
-- statement-breakpoint
INSERT INTO app_auth.identities(provider,subject,user_id)
SELECT 'google',a."accountId",a."userId" FROM neon_auth.account a
JOIN app_auth.users u ON u.id=a."userId"
WHERE a."providerId"='google' AND a."accountId" IS NOT NULL
ON CONFLICT DO NOTHING;
-- statement-breakpoint
