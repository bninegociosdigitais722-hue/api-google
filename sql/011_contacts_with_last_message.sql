-- View to join contacts with their latest message for atendimento summary.

CREATE OR REPLACE VIEW contacts_with_last_message AS
SELECT
  c.*,
  lm.body AS last_message_body,
  lm.direction AS last_message_direction,
  lm.created_at AS last_message_created_at
FROM contacts c
LEFT JOIN last_messages_by_contact lm
  ON lm.owner_id = c.owner_id AND lm.contact_id = c.id;
