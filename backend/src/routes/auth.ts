import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/auth';
import { UserRepository } from '../repositories/UserRepository';
import { HttpErrors, asyncHandler } from '../utils/errors';
import { authMiddleware, AuthRequest } from '../middleware';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  [
    body('email').isEmail().trim().toLowerCase(),
    body('username').isLength({ min: 3, max: 20 }).trim(),
    body('password').isLength({ min: 8 }),
    body('avatar').optional().isString(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { email, username, password, avatar } = req.body;

    // Check if user exists
    const existingEmail = await UserRepository.emailExists(email);
    if (existingEmail) {
      throw HttpErrors.Conflict('Email already registered');
    }

    const existingUsername = await UserRepository.usernameExists(username);
    if (existingUsername) {
      throw HttpErrors.Conflict('Username already taken');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await UserRepository.create(
      email,
      username,
      passwordHash,
      avatar
    );

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    const refreshToken = generateRefreshToken(user.id);

    // Calculate token expiry
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
        },
        token,
        refreshToken,
        expiresIn,
      },
    });
  })
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  [
    body('email').isEmail().trim().toLowerCase(),
    body('password').isLength({ min: 1 }),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { email, password } = req.body;

    // Find user
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw HttpErrors.Unauthorized('Invalid email or password');
    }

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      throw HttpErrors.Unauthorized('Invalid email or password');
    }

    // Update last login
    await UserRepository.updateLastLogin(user.id);

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    const refreshToken = generateRefreshToken(user.id);

    // Calculate token expiry
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
        },
        token,
        refreshToken,
        expiresIn,
      },
    });
  })
);

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post(
  '/refresh',
  [body('refreshToken').notEmpty()],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw HttpErrors.ValidationError(errors.array());
    }

    const { refreshToken } = req.body;

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw HttpErrors.Unauthorized('Invalid refresh token');
    }

    // Get user
    const user = await UserRepository.findById(payload.userId);
    if (!user || !user.is_active) {
      throw HttpErrors.NotFound('User not found');
    }

    // Generate new token
    const newToken = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

    res.json({
      success: true,
      data: {
        token: newToken,
        expiresIn,
      },
    });
  })
);

/**
 * GET /api/auth/me
 * Get current user info
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
 * POST /api/auth/logout
 * Logout (client-side token deletion is primary)
 */
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // In a real app, you might invalidate refresh tokens in a blacklist
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

export default router;
