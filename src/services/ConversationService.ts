import { getPool } from '../db/client';
import logger from '../logger';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface BrandConversation {
  id: string;
  brand_id: string;
  messages: ConversationMessage[];
  round_number: number;
  max_rounds: number;
  status: 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export class ConversationService {
  async create(brandId: string, maxRounds = 5): Promise<BrandConversation> {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO brand_conversations (brand_id, max_rounds) VALUES ($1, $2) RETURNING *`,
      [brandId, maxRounds]
    );
    logger.info(`Conversation created for brand ${brandId}: ${rows[0].id}`);
    return rows[0];
  }

  async getById(id: string): Promise<BrandConversation | null> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM brand_conversations WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async getActive(brandId: string): Promise<BrandConversation | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM brand_conversations WHERE brand_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [brandId]
    );
    return rows[0] || null;
  }

  async addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    const pool = getPool();
    const message: ConversationMessage = { role, content, timestamp: new Date().toISOString() };
    await pool.query(
      `UPDATE brand_conversations SET messages = messages || $2::jsonb WHERE id = $1`,
      [conversationId, JSON.stringify([message])]
    );
  }

  async incrementRound(conversationId: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE brand_conversations SET round_number = round_number + 1 WHERE id = $1`,
      [conversationId]
    );
  }

  async complete(conversationId: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE brand_conversations SET status = 'completed' WHERE id = $1`,
      [conversationId]
    );
  }
}
