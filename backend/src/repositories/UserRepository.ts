import { query, getClient } from '../database/connection';
import { User, UserProfile, UserPublic, PaginatedResponse, PaginationParams } from '../types/models';
import { hashPassword } from '../utils/auth';

/**
 * User Repository
 * All database operations related to users
 */

export const UserRepository = {
  /**
   * Create a new user
   */
  async create(
    email: string,
    username: string,
    passwordHash: string,
    avatar?: string,
    bio?: string
  ): Promise<User> {
    const result = await query<User>(
      `INSERT INTO users (email, username, password_hash, avatar, bio)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email, username, passwordHash, avatar, bio]
    );

    return result.rows[0];
  },

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  },

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
  },

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    return result.rows[0] || null;
  },

  /**
   * Get user with profile
   */
  async findByIdWithProfile(id: string): Promise<(User & { profile?: UserProfile }) | null> {
    const result = await query(
      `SELECT u.*, up.* as profile
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [id]
    );

    if (!result.rows.length) return null;

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      password_hash: user.password_hash,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login,
      is_active: user.is_active,
      profile: user.id ? {
        id: user.id,
        user_id: user.user_id,
        personality_traits: user.personality_traits,
        communication_style: user.communication_style,
        energy_level: user.energy_level,
        response_speed: user.response_speed,
        interests: user.interests,
        location: user.location,
        age: user.age,
        created_at: user.created_at,
        updated_at: user.updated_at,
      } : undefined,
    };
  },

  /**
   * Get public user profile
   */
  async findPublicProfile(id: string): Promise<UserPublic | null> {
    const result = await query(
      `SELECT u.id, u.username, u.avatar, u.bio, up.*
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [id]
    );

    if (!result.rows.length) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      avatar: row.avatar,
      bio: row.bio,
      profile: row.user_id ? {
        id: row.id,
        user_id: row.user_id,
        personality_traits: row.personality_traits,
        communication_style: row.communication_style,
        energy_level: row.energy_level,
        response_speed: row.response_speed,
        interests: row.interests,
        location: row.location,
        age: row.age,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } : undefined,
    };
  },

  /**
   * Update user
   */
  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).map((key, idx) => `${key} = $${idx + 2}`).join(', ');
    const values = Object.values(updates);

    const result = await query<User>(
      `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, ...values]
    );

    return result.rows[0] || null;
  },

  /**
   * Update last login
   */
  async updateLastLogin(id: string): Promise<void> {
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  },

  /**
   * List users with pagination
   */
  async list(params: PaginationParams = {}): Promise<PaginatedResponse<UserPublic>> {
    const { page = 1, pageSize = 20, sortBy = 'created_at', sortOrder = 'desc' } = params;
    const offset = (page - 1) * pageSize;

    // Get total count
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE is_active = true'
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const result = await query(
      `SELECT u.id, u.username, u.avatar, u.bio, up.* 
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.is_active = true
       ORDER BY u.${sortBy} ${sortOrder.toUpperCase()}
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    const data: UserPublic[] = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      avatar: row.avatar,
      bio: row.bio,
      profile: row.user_id ? {
        id: row.id,
        user_id: row.user_id,
        personality_traits: row.personality_traits,
        communication_style: row.communication_style,
        energy_level: row.energy_level,
        response_speed: row.response_speed,
        interests: row.interests,
        location: row.location,
        age: row.age,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } : undefined,
    }));

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  /**
   * Delete user (soft delete)
   */
  async delete(id: string): Promise<void> {
    await query(
      'UPDATE users SET is_active = false WHERE id = $1',
      [id]
    );
  },

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists',
      [email]
    );

    return result.rows[0].exists;
  },

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM users WHERE username = $1) as exists',
      [username]
    );

    return result.rows[0].exists;
  },

  /**
   * Search users
   */
  async search(searchTerm: string, limit: number = 10): Promise<UserPublic[]> {
    const term = `%${searchTerm}%`;

    const result = await query(
      `SELECT u.id, u.username, u.avatar, u.bio, up.*
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.is_active = true 
         AND (u.username ILIKE $1 OR u.bio ILIKE $1)
       LIMIT $2`,
      [term, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      avatar: row.avatar,
      bio: row.bio,
      profile: row.user_id ? {
        id: row.id,
        user_id: row.user_id,
        personality_traits: row.personality_traits,
        communication_style: row.communication_style,
        energy_level: row.energy_level,
        response_speed: row.response_speed,
        interests: row.interests,
        location: row.location,
        age: row.age,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } : undefined,
    }));
  },
};

export default UserRepository;
