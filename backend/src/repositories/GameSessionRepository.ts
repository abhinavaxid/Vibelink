import { query } from '../database/connection';
import { GameSession, Match } from '../types/models';

/**
 * GameSession Repository
 * All database operations related to game sessions
 */

export const GameSessionRepository = {
  /**
   * Create a new game session
   */
  async create(
    roomId: string,
    participantIds: string[],
    metadata?: Record<string, any>
  ): Promise<GameSession> {
    const result = await query<GameSession>(
      `INSERT INTO game_sessions (room_id, status, participant_ids, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [roomId, 'lobby', participantIds, JSON.stringify(metadata || {})]
    );

    return result.rows[0];
  },

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<GameSession | null> {
    const result = await query<GameSession>(
      'SELECT * FROM game_sessions WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  },

  /**
   * Update session
   */
  async update(id: string, updates: Partial<GameSession>): Promise<GameSession | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 2;

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'metadata') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    });

    if (fields.length === 0) return this.findById(id);

    const result = await query<GameSession>(
      `UPDATE game_sessions SET ${fields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      [id, ...values]
    );

    return result.rows[0] || null;
  },

  /**
   * Update session status and game state
   */
  async updateStatus(
    id: string,
    status: string,
    gameState?: string
  ): Promise<GameSession | null> {
    const updates: any = { status };
    if (gameState) updates.game_state = gameState;

    return this.update(id, updates);
  },

  /**
   * End session
   */
  async endSession(id: string): Promise<GameSession | null> {
    return this.update(id, {
      status: 'completed',
      ended_at: new Date(),
    });
  },

  /**
   * List active sessions
   */
  async listActive(): Promise<GameSession[]> {
    const result = await query<GameSession>(
      `SELECT * FROM game_sessions 
       WHERE status IN ('lobby', 'playing')
       ORDER BY created_at DESC`
    );

    return result.rows;
  },

  /**
   * List sessions by room
   */
  async listByRoom(roomId: string, limit: number = 10): Promise<GameSession[]> {
    const result = await query<GameSession>(
      `SELECT * FROM game_sessions 
       WHERE room_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [roomId, limit]
    );

    return result.rows;
  },

  /**
   * Get session with matches
   */
  async getSessionWithMatches(
    sessionId: string
  ): Promise<(GameSession & { matches: Match[] }) | null> {
    const sessionResult = await query<GameSession>(
      'SELECT * FROM game_sessions WHERE id = $1',
      [sessionId]
    );

    if (!sessionResult.rows.length) return null;

    const matchResult = await query<Match>(
      'SELECT * FROM matches WHERE game_session_id = $1 ORDER BY connection_score DESC',
      [sessionId]
    );

    return {
      ...sessionResult.rows[0],
      matches: matchResult.rows,
    };
  },

  /**
   * Get leaderboard for a session
   */
  async getLeaderboard(sessionId: string, limit: number = 10) {
    const result = await query(
      `SELECT 
        u.id, 
        u.username, 
        u.avatar,
        SUM(COALESCE(rr.raw_score, 0)) as total_score,
        COUNT(DISTINCT rr.round_number) as rounds_completed,
        AVG(COALESCE(rr.sentiment_score, 0)) as avg_sentiment,
        ROW_NUMBER() OVER (ORDER BY SUM(COALESCE(rr.raw_score, 0)) DESC) as rank
       FROM game_sessions gs
       CROSS JOIN LATERAL unnest(gs.participant_ids) as participant_id
       JOIN users u ON u.id = participant_id
       LEFT JOIN round_responses rr ON rr.game_session_id = gs.id AND rr.user_id = u.id
       WHERE gs.id = $1
       GROUP BY u.id
       ORDER BY total_score DESC
       LIMIT $2`,
      [sessionId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      avatar: row.avatar,
      score: parseInt(row.total_score || '0'),
      rank: row.rank,
      roundsCompleted: row.rounds_completed,
      averageSentiment: row.avg_sentiment,
    }));
  },

  /**
   * Get user's session history
   */
  async getUserSessions(userId: string, limit: number = 20) {
    const result = await query(
      `SELECT gs.* FROM game_sessions gs
       WHERE $1 = ANY(gs.participant_ids)
       ORDER BY gs.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows as GameSession[];
  },

  /**
   * Count active players in session
   */
  async countActiveParticipants(sessionId: string): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM game_sessions
       WHERE id = $1 AND array_length(participant_ids, 1) > 0`,
      [sessionId]
    );

    return parseInt(result.rows[0].count);
  },
};

export default GameSessionRepository;
