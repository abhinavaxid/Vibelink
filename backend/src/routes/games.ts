import { Router, Request, Response } from 'express';
import { param, body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware';
import { GameSessionRepository } from '../repositories/GameSessionRepository';
import { HttpErrors, asyncHandler } from '../utils/errors';
import { query as dbQuery } from '../database/connection';

const router = Router();

/**
 * POST /api/games/session
 * Create a new game session
 */
router.post(
  '/session',
  authMiddleware,
  [
    body('roomId').isUUID(),
    body('participantIds').isArray({ min: 1 }),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { roomId, participantIds } = req.body;

    // Verify room exists
    const roomResult = await dbQuery('SELECT * FROM rooms WHERE id = $1', [roomId]);
    if (!roomResult.rows.length) {
      throw HttpErrors.NotFound('Room not found');
    }

    // Create session
    const session = await GameSessionRepository.create(
      roomId,
      participantIds,
      { created_by: req.userId }
    );

    res.status(201).json({
      success: true,
      data: { session },
    });
  })
);

/**
 * GET /api/games/session/:sessionId
 * Get game session details
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

    const session = await GameSessionRepository.findById(sessionId);
    if (!session) {
      throw HttpErrors.NotFound('Game session not found');
    }

    res.json({
      success: true,
      data: { session },
    });
  })
);

/**
 * PATCH /api/games/session/:sessionId
 * Update game session
 */
router.patch(
  '/session/:sessionId',
  authMiddleware,
  [
    param('sessionId').isUUID(),
    body('status')
      .optional()
      .isIn(['lobby', 'playing', 'completed', 'cancelled']),
    body('gameState').optional().isString(),
    body('currentRound').optional().isInt({ min: 0 }),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { sessionId } = req.params;
    const { status, gameState, currentRound } = req.body;

    const session = await GameSessionRepository.findById(sessionId);
    if (!session) {
      throw HttpErrors.NotFound('Game session not found');
    }

    // TODO: Add permission check (game creator or admin)

    const updates: any = {};
    if (status) updates.status = status;
    if (gameState) updates.game_state = gameState;
    if (currentRound !== undefined) updates.current_round = currentRound;

    const updatedSession = await GameSessionRepository.update(sessionId, updates);

    res.json({
      success: true,
      data: { session: updatedSession },
    });
  })
);

/**
 * GET /api/games/session/:sessionId/leaderboard
 * Get session leaderboard
 */
router.get(
  '/session/:sessionId/leaderboard',
  [param('sessionId').isUUID()],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { sessionId } = req.params;

    const leaderboard = await GameSessionRepository.getLeaderboard(sessionId);

    res.json({
      success: true,
      data: {
        leaderboard,
        total: leaderboard.length,
      },
    });
  })
);

/**
 * GET /api/games/user/:userId/history
 * Get user's game session history
 */
router.get(
  '/user/:userId/history',
  [param('userId').isUUID()],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { userId } = req.params;

    const sessions = await GameSessionRepository.getUserSessions(userId);

    res.json({
      success: true,
      data: {
        sessions,
        total: sessions.length,
      },
    });
  })
);

/**
 * POST /api/games/session/:sessionId/response
 * Submit round response
 */
router.post(
  '/session/:sessionId/response',
  authMiddleware,
  [
    param('sessionId').isUUID(),
    body('roundNumber').isInt({ min: 1 }),
    body('roundType').isString(),
    body('responseText').optional().isString(),
    body('responseData').optional().isObject(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { sessionId } = req.params;
    const { roundNumber, roundType, responseText, responseData } = req.body;

    // Verify session exists
    const session = await GameSessionRepository.findById(sessionId);
    if (!session) {
      throw HttpErrors.NotFound('Game session not found');
    }

    // Verify user is participant
    if (!session.participant_ids.includes(req.userId!)) {
      throw HttpErrors.Forbidden('You are not participating in this session');
    }

    // Insert response
    const result = await dbQuery(
      `INSERT INTO round_responses 
       (game_session_id, user_id, round_number, round_type, response_text, response_data, raw_score)
       VALUES ($1, $2, $3, $4, $5, $6, 10)
       RETURNING *
       ON CONFLICT (game_session_id, user_id, round_number) 
       DO UPDATE SET response_text = EXCLUDED.response_text, response_data = EXCLUDED.response_data
       RETURNING *`,
      [
        sessionId,
        req.userId,
        roundNumber,
        roundType,
        responseText,
        JSON.stringify(responseData || {}),
      ]
    );

    res.status(201).json({
      success: true,
      data: { response: result.rows[0] },
    });
  })
);

export default router;
