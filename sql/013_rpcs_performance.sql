-- RPCs focadas em performance e percepção.
-- Observações:
-- - SECURITY INVOKER (padrão) para respeitar RLS.
-- - owner_id NUNCA é passado como parâmetro; usa current_owner_id() + EXISTS membership.
-- - Payload mínimo e paginado.

-- Lista de conversas (atendimento) com preview.
CREATE OR REPLACE FUNCTION public.list_atendimento_conversas(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id bigint,
  phone text,
  name text,
  is_whatsapp boolean,
  last_message_at timestamptz,
  photo_url text,
  chat_unread boolean,
  last_message_body text,
  last_message_direction text,
  last_message_created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.phone,
    c.name,
    c.is_whatsapp,
    c.last_message_at,
    c.photo_url,
    c.chat_unread,
    lm.body,
    lm.direction,
    lm.created_at
  FROM contacts c
  LEFT JOIN last_messages_by_contact lm
    ON lm.contact_id = c.id
   AND lm.owner_id = c.owner_id
  WHERE
    c.owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = c.owner_id AND m.user_id = auth.uid()
    )
  ORDER BY c.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Lista de consultas (contatos) enxuta.
CREATE OR REPLACE FUNCTION public.list_consultas(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id bigint,
  name text,
  phone text,
  is_whatsapp boolean,
  last_message_at timestamptz,
  last_outbound_template text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.phone,
    c.is_whatsapp,
    c.last_message_at,
    c.last_outbound_template
  FROM contacts c
  WHERE
    c.owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = c.owner_id AND m.user_id = auth.uid()
    )
  ORDER BY c.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Índice auxiliar para ORDER BY + filtro (caso não exista).
CREATE INDEX IF NOT EXISTS idx_contacts_owner_last_message_at_desc
  ON contacts (owner_id, last_message_at DESC);
