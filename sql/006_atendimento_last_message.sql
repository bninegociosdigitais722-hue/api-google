-- Última mensagem por contato (para previews rápidos no atendimento)

CREATE OR REPLACE VIEW last_messages_by_contact AS
SELECT DISTINCT ON (owner_id, contact_id)
  owner_id,
  contact_id,
  body,
  direction,
  status,
  created_at
FROM messages
ORDER BY owner_id, contact_id, created_at DESC;
