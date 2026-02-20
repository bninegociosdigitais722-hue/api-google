-- Fortalece RLS exigindo membership ativa para o owner_id do JWT.
-- Também garante índice composto eficiente em memberships(user_id, owner_id).

CREATE INDEX IF NOT EXISTS idx_memberships_user_owner
  ON memberships (user_id, owner_id);

-- contacts
DROP POLICY IF EXISTS contacts_select ON contacts;
DROP POLICY IF EXISTS contacts_insert ON contacts;
DROP POLICY IF EXISTS contacts_update ON contacts;
DROP POLICY IF EXISTS contacts_delete ON contacts;

CREATE POLICY contacts_select ON contacts
  FOR SELECT USING (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY contacts_insert ON contacts
  FOR INSERT WITH CHECK (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY contacts_update ON contacts
  FOR UPDATE USING (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY contacts_delete ON contacts
  FOR DELETE USING (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

-- messages
DROP POLICY IF EXISTS messages_select ON messages;
DROP POLICY IF EXISTS messages_insert ON messages;
DROP POLICY IF EXISTS messages_update ON messages;
DROP POLICY IF EXISTS messages_delete ON messages;

CREATE POLICY messages_select ON messages
  FOR SELECT USING (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY messages_insert ON messages
  FOR INSERT WITH CHECK (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY messages_update ON messages
  FOR UPDATE USING (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY messages_delete ON messages
  FOR DELETE USING (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

-- campaigns
DROP POLICY IF EXISTS campaigns_select ON campaigns;
DROP POLICY IF EXISTS campaigns_insert ON campaigns;
DROP POLICY IF EXISTS campaigns_update ON campaigns;
DROP POLICY IF EXISTS campaigns_delete ON campaigns;

CREATE POLICY campaigns_select ON campaigns
  FOR SELECT USING (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY campaigns_insert ON campaigns
  FOR INSERT WITH CHECK (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY campaigns_update ON campaigns
  FOR UPDATE USING (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY campaigns_delete ON campaigns
  FOR DELETE USING (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

-- campaign_targets
DROP POLICY IF EXISTS campaign_targets_select ON campaign_targets;
DROP POLICY IF EXISTS campaign_targets_insert ON campaign_targets;
DROP POLICY IF EXISTS campaign_targets_update ON campaign_targets;
DROP POLICY IF EXISTS campaign_targets_delete ON campaign_targets;

CREATE POLICY campaign_targets_select ON campaign_targets
  FOR SELECT USING (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY campaign_targets_insert ON campaign_targets
  FOR INSERT WITH CHECK (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY campaign_targets_update ON campaign_targets
  FOR UPDATE USING (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY campaign_targets_delete ON campaign_targets
  FOR DELETE USING (
    owner_id = current_owner_id()
    AND EXISTS (
      SELECT 1 FROM memberships m WHERE m.owner_id = owner_id AND m.user_id = auth.uid()
    )
  );
