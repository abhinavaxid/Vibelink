import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { query as dbQuery } from '../database/connection';
import { HttpErrors, asyncHandler } from '../utils/errors';
import { optionalAuthMiddleware } from '../middleware';

const router = Router();

/**
 * GET /api/rooms
 * List all available rooms
 */
router.get(
  '/',
  optionalAuthMiddleware,
  [query('type').optional().isIn(['friendship', 'collaborators', 'mentorship', 'travel', 'gamers', 'love-connection'])],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { type } = req.query;

    let sql = 'SELECT * FROM rooms WHERE is_active = true';
    const params: any[] = [];

    if (type) {
      sql += ' AND room_type = $1';
      params.push(type);
    }

    sql += ' ORDER BY name ASC';

    const result = await dbQuery(sql, params);

    res.json({
      success: true,
      data: {
        rooms: result.rows,
        total: result.rows.length,
      },
    });
  })
);

/**
 * GET /api/rooms/:roomId
 * Get room details
 */
router.get(
  '/:roomId',
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const result = await dbQuery(
      'SELECT * FROM rooms WHERE id = $1',
      [roomId]
    );

    if (!result.rows.length) {
      throw HttpErrors.NotFound('Room not found');
    }

    res.json({
      success: true,
      data: { room: result.rows[0] },
    });
  })
);

/**
 * GET /api/rooms/:roomId/sessions
 * Get active sessions in a room
 */
router.get(
  '/:roomId/sessions',
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    // Verify room exists
    const roomResult = await dbQuery(
      'SELECT * FROM rooms WHERE id = $1',
      [roomId]
    );

    if (!roomResult.rows.length) {
      throw HttpErrors.NotFound('Room not found');
    }

    // Get active sessions
    const sessionsResult = await dbQuery(
      `SELECT * FROM game_sessions 
       WHERE room_id = $1 AND status IN ('lobby', 'playing')
       ORDER BY created_at DESC`,
      [roomId]
    );

    res.json({
      success: true,
      data: {
        sessions: sessionsResult.rows,
        total: sessionsResult.rows.length,
      },
    });
  })
);

/**
 * GET /api/rooms/stats
 * Get statistics about rooms
 */
router.get(
  '/stats/overview',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await dbQuery(`
      SELECT 
        COUNT(DISTINCT r.id) as total_rooms,
        COUNT(DISTINCT gs.id) as active_sessions,
        COUNT(DISTINCT u.id) as total_participants
      FROM rooms r
      LEFT JOIN game_sessions gs ON r.id = gs.room_id AND gs.status IN ('lobby', 'playing')
      LEFT JOIN LATERAL unnest(gs.participant_ids) AS u(id) ON true
    `);

    if (!result.rows.length) {
      throw HttpErrors.InternalServerError('Failed to fetch stats');
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

export default router;
