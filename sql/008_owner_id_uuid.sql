-- Convert owner_id columns to uuid using a stable owners mapping.
-- Ensure pgcrypto is available for gen_random_uuid().

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_key text UNIQUE
);

WITH existing_owner_keys AS (
  SELECT DISTINCT owner_id::text AS legacy_key FROM contacts
  UNION
  SELECT DISTINCT owner_id::text FROM messages
  UNION
  SELECT DISTINCT owner_id::text FROM campaigns
  UNION
  SELECT DISTINCT owner_id::text FROM campaign_targets
  UNION
  SELECT DISTINCT owner_id::text FROM memberships
)
INSERT INTO owners (id, legacy_key)
SELECT
  CASE
    WHEN legacy_key ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
      THEN legacy_key::uuid
    ELSE gen_random_uuid()
  END,
  legacy_key
FROM existing_owner_keys
ON CONFLICT (legacy_key) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS owner_id_uuid uuid;
    UPDATE contacts c SET owner_id_uuid = o.id
    FROM owners o
    WHERE o.legacy_key = c.owner_id::text;
    ALTER TABLE contacts ALTER COLUMN owner_id_uuid SET NOT NULL;
    ALTER TABLE contacts DROP COLUMN owner_id;
    ALTER TABLE contacts RENAME COLUMN owner_id_uuid TO owner_id;
    ALTER TABLE contacts
      ADD CONSTRAINT IF NOT EXISTS contacts_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON contacts (owner_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_owner_phone ON contacts (owner_id, phone);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS owner_id_uuid uuid;
    UPDATE messages m SET owner_id_uuid = o.id
    FROM owners o
    WHERE o.legacy_key = m.owner_id::text;
    ALTER TABLE messages ALTER COLUMN owner_id_uuid SET NOT NULL;
    ALTER TABLE messages DROP COLUMN owner_id;
    ALTER TABLE messages RENAME COLUMN owner_id_uuid TO owner_id;
    ALTER TABLE messages
      ADD CONSTRAINT IF NOT EXISTS messages_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_messages_owner_id ON messages (owner_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS owner_id_uuid uuid;
    UPDATE campaigns c SET owner_id_uuid = o.id
    FROM owners o
    WHERE o.legacy_key = c.owner_id::text;
    ALTER TABLE campaigns ALTER COLUMN owner_id_uuid SET NOT NULL;
    ALTER TABLE campaigns DROP COLUMN owner_id;
    ALTER TABLE campaigns RENAME COLUMN owner_id_uuid TO owner_id;
    ALTER TABLE campaigns
      ADD CONSTRAINT IF NOT EXISTS campaigns_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_campaigns_owner_id ON campaigns (owner_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_targets' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE campaign_targets ADD COLUMN IF NOT EXISTS owner_id_uuid uuid;
    UPDATE campaign_targets ct SET owner_id_uuid = o.id
    FROM owners o
    WHERE o.legacy_key = ct.owner_id::text;
    ALTER TABLE campaign_targets ALTER COLUMN owner_id_uuid SET NOT NULL;
    ALTER TABLE campaign_targets DROP COLUMN owner_id;
    ALTER TABLE campaign_targets RENAME COLUMN owner_id_uuid TO owner_id;
    ALTER TABLE campaign_targets
      ADD CONSTRAINT IF NOT EXISTS campaign_targets_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_campaign_targets_owner_id ON campaign_targets (owner_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memberships' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE memberships ADD COLUMN IF NOT EXISTS owner_id_uuid uuid;
    UPDATE memberships m SET owner_id_uuid = o.id
    FROM owners o
    WHERE o.legacy_key = m.owner_id::text;
    ALTER TABLE memberships ALTER COLUMN owner_id_uuid SET NOT NULL;
    ALTER TABLE memberships DROP COLUMN owner_id;
    ALTER TABLE memberships RENAME COLUMN owner_id_uuid TO owner_id;
    ALTER TABLE memberships
      ADD CONSTRAINT IF NOT EXISTS memberships_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_memberships_owner_id ON memberships (owner_id);
    CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships (user_id);
  END IF;
END $$;
