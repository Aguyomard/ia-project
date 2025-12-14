import pool from '../../config/postgres.js';
import type {
  Conversation,
  Message,
  CreateMessageInput,
  ChatMessage,
} from './types.js';

/**
 * Service pour gérer les conversations et messages
 */
export class ConversationService {
  /**
   * Crée une nouvelle conversation
   */
  public async createConversation(
    userId?: string,
    title?: string
  ): Promise<Conversation> {
    const result = await pool.query<Conversation>(
      `INSERT INTO conversations (user_id, title) 
       VALUES ($1, $2) 
       RETURNING id, user_id as "userId", title, created_at as "createdAt", updated_at as "updatedAt"`,
      [userId || null, title || null]
    );
    return result.rows[0];
  }

  /**
   * Récupère une conversation par son ID
   */
  public async getConversation(id: string): Promise<Conversation | null> {
    const result = await pool.query<Conversation>(
      `SELECT id, user_id as "userId", title, created_at as "createdAt", updated_at as "updatedAt"
       FROM conversations WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Ajoute un message à une conversation
   */
  public async addMessage(input: CreateMessageInput): Promise<Message> {
    const result = await pool.query<Message>(
      `INSERT INTO messages (conversation_id, role, content)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id as "conversationId", role, content, created_at as "createdAt"`,
      [input.conversationId, input.role, input.content]
    );

    // Met à jour updated_at de la conversation
    await pool.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [input.conversationId]
    );

    return result.rows[0];
  }

  /**
   * Récupère tous les messages d'une conversation (triés par date)
   */
  public async getMessages(conversationId: string): Promise<Message[]> {
    const result = await pool.query<Message>(
      `SELECT id, conversation_id as "conversationId", role, content, created_at as "createdAt"
       FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC`,
      [conversationId]
    );
    return result.rows;
  }

  /**
   * Récupère les messages au format ChatMessage pour Mistral
   */
  public async getChatHistory(conversationId: string): Promise<ChatMessage[]> {
    const messages = await this.getMessages(conversationId);
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  /**
   * Liste les conversations d'un utilisateur
   */
  public async listConversations(userId?: string): Promise<Conversation[]> {
    const result = await pool.query<Conversation>(
      `SELECT id, user_id as "userId", title, created_at as "createdAt", updated_at as "updatedAt"
       FROM conversations 
       ${userId ? 'WHERE user_id = $1' : ''}
       ORDER BY updated_at DESC`,
      userId ? [userId] : []
    );
    return result.rows;
  }

  /**
   * Supprime une conversation et ses messages
   */
  public async deleteConversation(id: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM conversations WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Génère un titre pour la conversation basé sur le premier message
   */
  public async generateTitle(conversationId: string): Promise<void> {
    const messages = await this.getMessages(conversationId);
    const firstUserMessage = messages.find((m) => m.role === 'user');

    if (firstUserMessage) {
      const title =
        firstUserMessage.content.substring(0, 50) +
        (firstUserMessage.content.length > 50 ? '...' : '');

      await pool.query(`UPDATE conversations SET title = $1 WHERE id = $2`, [
        title,
        conversationId,
      ]);
    }
  }
}

// Singleton
let instance: ConversationService | null = null;

export function getConversationService(): ConversationService {
  if (!instance) {
    instance = new ConversationService();
  }
  return instance;
}

export default ConversationService;

