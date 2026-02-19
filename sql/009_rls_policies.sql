-- Enable RLS and add simple, index-friendly policies by owner_id.

CREATE OR REPLACE FUNCTION public.current_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF((auth.jwt() -> 'app_metadata' ->> 'owner_id'), '')::uuid;
$$;

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contacts_select ON contacts;
DROP POLICY IF EXISTS contacts_insert ON contacts;
DROP POLICY IF EXISTS contacts_update ON contacts;
DROP POLICY IF EXISTS contacts_delete ON contacts;

CREATE POLICY contacts_select ON contacts
  FOR SELECT USING (owner_id = current_owner_id());
CREATE POLICY contacts_insert ON contacts
  FOR INSERT WITH CHECK (owner_id = current_owner_id());
CREATE POLICY contacts_update ON contacts
  FOR UPDATE USING (owner_id = current_owner_id()) WITH CHECK (owner_id = current_owner_id());
CREATE POLICY contacts_delete ON contacts
  FOR DELETE USING (owner_id = current_owner_id());

DROP POLICY IF EXISTS messages_select ON messages;
DROP POLICY IF EXISTS messages_insert ON messages;
DROP POLICY IF EXISTS messages_update ON messages;
DROP POLICY IF EXISTS messages_delete ON messages;

CREATE POLICY messages_select ON messages
  FOR SELECT USING (owner_id = current_owner_id());
CREATE POLICY messages_insert ON messages
  FOR INSERT WITH CHECK (owner_id = current_owner_id());
CREATE POLICY messages_update ON messages
  FOR UPDATE USING (owner_id = current_owner_id()) WITH CHECK (owner_id = current_owner_id());
CREATE POLICY messages_delete ON messages
  FOR DELETE USING (owner_id = current_owner_id());

DROP POLICY IF EXISTS campaigns_select ON campaigns;
DROP POLICY IF EXISTS campaigns_insert ON campaigns;
DROP POLICY IF EXISTS campaigns_update ON campaigns;
DROP POLICY IF EXISTS campaigns_delete ON campaigns;

CREATE POLICY campaigns_select ON campaigns
  FOR SELECT USING (owner_id = current_owner_id());
CREATE POLICY campaigns_insert ON campaigns
  FOR INSERT WITH CHECK (owner_id = current_owner_id());
CREATE POLICY campaigns_update ON campaigns
  FOR UPDATE USING (owner_id = current_owner_id()) WITH CHECK (owner_id = current_owner_id());
CREATE POLICY campaigns_delete ON campaigns
  FOR DELETE USING (owner_id = current_owner_id());

DROP POLICY IF EXISTS campaign_targets_select ON campaign_targets;
DROP POLICY IF EXISTS campaign_targets_insert ON campaign_targets;
DROP POLICY IF EXISTS campaign_targets_update ON campaign_targets;
DROP POLICY IF EXISTS campaign_targets_delete ON campaign_targets;

CREATE POLICY campaign_targets_select ON campaign_targets
  FOR SELECT USING (owner_id = current_owner_id());
CREATE POLICY campaign_targets_insert ON campaign_targets
  FOR INSERT WITH CHECK (owner_id = current_owner_id());
CREATE POLICY campaign_targets_update ON campaign_targets
  FOR UPDATE USING (owner_id = current_owner_id()) WITH CHECK (owner_id = current_owner_id());
CREATE POLICY campaign_targets_delete ON campaign_targets
  FOR DELETE USING (owner_id = current_owner_id());

DROP POLICY IF EXISTS memberships_select_own ON memberships;

CREATE POLICY memberships_select_own ON memberships
  FOR SELECT USING (user_id = auth.uid());
