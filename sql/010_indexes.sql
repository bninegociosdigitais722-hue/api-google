-- Additional indexes for common filters and joins.

CREATE INDEX IF NOT EXISTS idx_messages_owner_provider_message_id
  ON messages (owner_id, provider_message_id);

CREATE INDEX IF NOT EXISTS idx_messages_owner_contact_created_at_desc
  ON messages (owner_id, contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id
  ON memberships (user_id);
