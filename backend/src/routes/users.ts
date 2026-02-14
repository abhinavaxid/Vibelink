import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { UserRepository } from '../repositories/UserRepository';
import { HttpErrors, asyncHandler } from '../utils/errors';
import { authMiddleware, AuthRequest, optionalAuthMiddleware } from '../middleware';

const router = Router();
const USER_ID_PARAM = ':userId([0-9a-fA-F-]{36})';

/**
 * GET /api/users
 * List all users with pagination
 */
router.get(
  '/',
  optionalAuthMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isIn(['created_at', 'username']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { page, pageSize, sortBy, sortOrder } = req.query;

    const result = await UserRepository.list({
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 10,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/users/search
 * Search users by username or bio
 */
router.get(
  '/search',
  [query('q').notEmpty().trim().isLength({ min: 1, max: 50 })],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { q } = req.query;

    const results = await UserRepository.search(q as string);

    res.json({
      success: true,
      data: { results },
    });
  })
);

/**
 * GET /api/users/me
 * Get current authenticated user's profile
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw HttpErrors.Unauthorized('No user ID in token');
    }

    const user = await UserRepository.findPublicProfile(req.userId);
    if (!user) {
      throw HttpErrors.NotFound('User not found');
    }

    res.json({
      success: true,
      data: { user },
    });
  })
);

/**
 * PATCH /api/users/me
 * Update current authenticated user's profile
 */
router.patch(
  '/me',
  authMiddleware,
  [
    body('bio').optional().isString().trim().isLength({ max: 500 }),
    body('avatar').optional().isString().trim(),
    body('communication_style')
      .optional()
      .isIn(['direct', 'diplomatic', 'humorous', 'empathetic']),
    body('energy_level').optional().isIn(['high', 'medium', 'low']),
    body('interests').optional().isArray(),
    body('location').optional().isString().trim(),
    body('age').optional().isInt({ min: 13, max: 120 }),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    if (!req.userId) {
      throw HttpErrors.Unauthorized('No user ID in token');
    }

    const {
      bio,
      avatar,
      communication_style,
      energy_level,
      interests,
      location,
      age,
    } = req.body;

    await UserRepository.update(req.userId, {
      bio,
      avatar,
    });

    if (communication_style || energy_level || interests || location || age) {
      const profile = await UserRepository.findByIdWithProfile(req.userId);

      if (profile?.profile) {
        // Update existing profile
        // (This would need a UserProfileRepository)
      } else {
        // Create new profile
        // (This would need a UserProfileRepository)
      }
    }

    const updatedUser = await UserRepository.findPublicProfile(req.userId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  })
);

/**
 * GET /api/users/:userId
 * Get user profile by ID
 */
router.get(
  `/${USER_ID_PARAM}`,
  [param('userId').isUUID()],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { userId } = req.params;

    const user = await UserRepository.findPublicProfile(userId);
    if (!user) {
      throw HttpErrors.NotFound('User not found');
    }

    res.json({
      success: true,
      data: { user },
    });
  })
);

/**
 * PATCH /api/users/:userId
 * Update user profile (only own profile or admin)
 */
router.patch(
  `/${USER_ID_PARAM}`,
  authMiddleware,
  [
    param('userId').isUUID(),
    body('bio').optional().isString().trim().isLength({ max: 500 }),
    body('avatar').optional().isString().trim(),
    body('communication_style')
      .optional()
      .isIn(['direct', 'diplomatic', 'humorous', 'empathetic']),
    body('energy_level').optional().isIn(['high', 'medium', 'low']),
    body('interests').optional().isArray(),
    body('location').optional().isString().trim(),
    body('age').optional().isInt({ min: 13, max: 120 }),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { userId } = req.params;

    // Check authorization
    if (req.userId !== userId) {
      throw HttpErrors.Forbidden('Cannot update other user profiles');
    }

    const {
      bio,
      avatar,
      communication_style,
      energy_level,
      interests,
      location,
      age,
    } = req.body;

    // Update user
    await UserRepository.update(userId, {
      bio,
      avatar,
    });

    // Update profile
    if (communication_style || energy_level || interests || location || age) {
      // Get or create profile
      const profile = await UserRepository.findByIdWithProfile(userId);

      if (profile?.profile) {
        // Update existing profile
        // (This would need a UserProfileRepository)
      } else {
        // Create new profile
        // (This would need a UserProfileRepository)
      }
    }

    const updatedUser = await UserRepository.findPublicProfile(userId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  })
);

/**
 * DELETE /api/users/:userId
 * Soft delete user (only own account)
 */
router.delete(
  `/${USER_ID_PARAM}`,
  authMiddleware,
  [param('userId').isUUID()],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { userId } = req.params;

    // Check authorization
    if (req.userId !== userId) {
      throw HttpErrors.Forbidden('Cannot delete other accounts');
    }

    await UserRepository.delete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  })
);

/**
 * GET /api/users/:userId/connections
 * Get user's connections
 */
router.get(
  `/${USER_ID_PARAM}/connections`,
  [param('userId').isUUID()],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { userId } = req.params;

    // Verify user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw HttpErrors.NotFound('User not found');
    }

    // TODO: Query connections from database
    res.json({
      success: true,
      data: {
        connections: [],
        total: 0,
      },
    });
  })
);

/**
 * POST /api/users/:userId/follow
 * Follow a user
 */
router.post(
  `/${USER_ID_PARAM}/follow`,
  authMiddleware,
  [param('userId').isUUID()],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { userId } = req.params;

    if (req.userId === userId) {
      throw HttpErrors.BadRequest('Cannot follow yourself');
    }

    // Verify target user exists
    const targetUser = await UserRepository.findById(userId);
    if (!targetUser) {
      throw HttpErrors.NotFound('User not found');
    }

    // TODO: Create connection in database

    res.json({
      success: true,
      message: 'User followed successfully',
    });
  })
);

export default router;
