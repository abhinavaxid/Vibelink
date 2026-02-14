import { Router, Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest, optionalAuthMiddleware } from '../middleware';
import { HttpErrors, asyncHandler } from '../utils/errors';
import { query as dbQuery } from '../database/connection';

const router = Router();

/**
 * GET /api/matches/session/:sessionId
 * Get all matches from a session
 */
router.get(
  '/session/:sessionId',
  [param('sessionId').isUUID()],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { sessionId } = req.params;

    // Verify session exists
    const sessionResult = await dbQuery(
      'SELECT * FROM game_sessions WHERE id = $1',
      [sessionId]
    );

    if (!sessionResult.rows.length) {
      throw HttpErrors.NotFound('Game session not found');
    }

    // Get matches sorted by connection score
    const matchResult = await dbQuery(
      `SELECT 
        m.*,
        u1.username as user1_username,
        u1.avatar as user1_avatar,
        u2.username as user2_username,
        u2.avatar as user2_avatar
       FROM matches m
       JOIN users u1 ON m.user1_id = u1.id
       JOIN users u2 ON m.user2_id = u2.id
       WHERE m.game_session_id = $1
       ORDER BY m.connection_score DESC`,
      [sessionId]
    );

    res.json({
      success: true,
      data: {
        matches: matchResult.rows,
        total: matchResult.rows.length,
      },
    });
  })
);

/**
 * GET /api/matches/user/:userId
 * Get user's top matches
 */
router.get(
  '/user/:userId',
  [
    param('userId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { userId } = req.params;
    const { limit = 10 } = req.query;

    // Get connection history sorted by score
    const result = await dbQuery(
      `SELECT 
        CASE 
          WHEN user1_id = $1 THEN user2_id
          ELSE user1_id
        END as matched_user_id,
        average_score,
        total_match_count,
        last_matched_at,
        u.username,
        u.avatar
       FROM connection_history ch
       JOIN users u ON (
         CASE 
           WHEN user1_id = $1 THEN user2_id
           ELSE user1_id
         END = u.id
       )
       WHERE user1_id = $1 OR user2_id = $1
       ORDER BY average_score DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({
      success: true,
      data: {
        matches: result.rows,
        total: result.rows.length,
      },
    });
  })
);

/**
 * GET /api/matches/user/:userId/with/:otherUserId
 * Get match history between two users
 */
router.get(
  '/user/:userId/with/:otherUserId',
  [param('userId').isUUID(), param('otherUserId').isUUID()],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { userId, otherUserId } = req.params;

    // Get connection history
    const result = await dbQuery(
      `SELECT * FROM connection_history
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [userId, otherUserId]
    );

    if (!result.rows.length) {
      res.json({
        success: true,
        data: {
          connectionHistory: null,
          message: 'No match history found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        connectionHistory: result.rows[0],
      },
    });
  })
);

/**
 * GET /api/matches/explore
 * Get recommended matches based on compatibility
 */
router.get(
  '/explore',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // This is a placeholder for recommendation algorithm
    // In production, you'd use ML/AI for personalized recommendations

    const result = await dbQuery(
      `SELECT DISTINCT 
        u.id,
        u.username,
        u.avatar,
        u.bio,
        AVG(ch.average_score) as avg_compatibility
       FROM users u
       LEFT JOIN connection_history ch ON (
         (ch.user1_id = u.id OR ch.user2_id = u.id) AND 
         (ch.user1_id = $1 OR ch.user2_id = $1)
       )
       WHERE u.id != $1 AND u.is_active = true
       GROUP BY u.id
       ORDER BY avg_compatibility DESC NULLS LAST
       LIMIT 10`,
      [req.userId]
    );

    res.json({
      success: true,
      data: {
        recommendations: result.rows,
        total: result.rows.length,
      },
    });
  })
);

/**
 * POST /api/matches/session/:sessionId/calculate
 * Calculate matches for a completed session
 */
router.post(
  '/session/:sessionId/calculate',
  authMiddleware,
  [param('sessionId').isUUID()],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { sessionId } = req.params;

    // TODO: Implement comprehensive match calculation algorithm
    // This should:
    // 1. Get all responses from all rounds
    // 2. Calculate compatibility between each pair
    // 3. Store matches in database
    // 4. Update connection history

    res.json({
      success: true,
      message: 'Match calculation completed',
    });
  })
);

/**
 * GET /api/matches/leaderboard
 * Get global leaderboard
 */
router.get(
  '/leaderboard',
  optionalAuthMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('leaderboard_type')
      .optional()
      .isIn(['session', 'weekly', 'all_time']),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { limit = 100, leaderboard_type = 'all_time' } = req.query;

    const result = await dbQuery(
      `SELECT 
        lb.*,
        u.username,
        u.avatar
       FROM leaderboards lb
       JOIN users u ON lb.user_id = u.id
       WHERE lb.leaderboard_type = $1
       ORDER BY lb.score DESC
       LIMIT $2`,
      [leaderboard_type, limit]
    );

    res.json({
      success: true,
      data: {
        leaderboard: result.rows,
        total: result.rows.length,
        type: leaderboard_type,
      },
    });
  })
);

export default router;
