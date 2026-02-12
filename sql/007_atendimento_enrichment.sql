-- Enriquecimento do atendimento (perfil, presença e edição/exclusão)

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS photo_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS notify text,
  ADD COLUMN IF NOT EXISTS short text,
  ADD COLUMN IF NOT EXISTS vname text,
  ADD COLUMN IF NOT EXISTS metadata_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS presence_status text,
  ADD COLUMN IF NOT EXISTS presence_last_seen timestamptz,
  ADD COLUMN IF NOT EXISTS presence_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS chat_unread boolean DEFAULT false;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
