-- F1: Progress logs
ALTER TABLE jobs ADD COLUMN progress_log JSONB NOT NULL DEFAULT '[]';

-- F2: Multi-source + review
ALTER TABLE brands ADD COLUMN sources JSONB NOT NULL DEFAULT '[]';
ALTER TABLE brands DROP CONSTRAINT brands_status_check;
ALTER TABLE brands ADD CONSTRAINT brands_status_check
  CHECK (status IN ('pending','extracting','extracted','awaiting_review','generating_templates','ready','failed'));

CREATE TABLE brand_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  round_number INT NOT NULL DEFAULT 0,
  max_rounds INT NOT NULL DEFAULT 5,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_brand_conversations_brand ON brand_conversations(brand_id);
CREATE TRIGGER brand_conversations_updated_at BEFORE UPDATE ON brand_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- F4: Document editing
ALTER TABLE documents ADD COLUMN rendered_html TEXT;
ALTER TABLE documents ADD COLUMN edited_html TEXT;
