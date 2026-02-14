/**
 * Database Models/Types
 * Strong typing for all database entities
 */

// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  password_hash: string;
  bio?: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  personality_traits: Record<string, any>;
  communication_style?: string;
  energy_level?: string;
  response_speed?: string;
  interests?: string[];
  location?: string;
  age?: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  profile?: UserProfile;
}

// Room Types
export interface Room {
  id: string;
  room_type: string;
  name: string;
  description?: string;
  max_participants: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Game Session Types
export interface GameSession {
  id: string;
  room_id?: string;
  status: 'lobby' | 'playing' | 'completed' | 'cancelled';
  current_round: number;
  game_state?: string;
  participant_ids: string[];
  started_at?: Date;
  ended_at?: Date;
  created_at: Date;
  metadata?: Record<string, any>;
}

// Round Response Types
export interface RoundResponse {
  id: string;
  game_session_id: string;
  user_id: string;
  round_number: number;
  round_type?: string;
  response_text?: string;
  response_data?: Record<string, any>;
  raw_score: number;
  sentiment_score?: number;
  empathy_score?: number;
  energy_level?: number;
  submitted_at: Date;
}

// Match Types
export interface Match {
  id: string;
  game_session_id: string;
  user1_id: string;
  user2_id: string;
  connection_score?: number;
  compatibility_breakdown?: {
    communication?: number;
    humor?: number;
    teamwork?: number;
    empathy?: number;
  };
  match_strength?: string;
  match_tags?: string[];
  created_at: Date;
}

export interface ConnectionHistory {
  id: string;
  user1_id: string;
  user2_id: string;
  total_match_count: number;
  average_score: number;
  last_matched_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Audience Types
export interface AudienceVote {
  id: string;
  game_session_id: string;
  voter_id?: string;
  category: string;
  nominee_id: string;
  vote_weight: number;
  created_at: Date;
}

// Meme Types
export interface MemeUpload {
  id: string;
  game_session_id: string;
  user_id: string;
  meme_url: string;
  caption: string;
  template_id?: string;
  total_reactions: number;
  created_at: Date;
}

export interface MemeReaction {
  id: string;
  meme_id: string;
  user_id: string;
  reaction_type: string;
  created_at: Date;
}

// Chat Types
export interface ChatMessage {
  id: string;
  game_session_id: string;
  sender_id: string;
  message_text: string;
  round_type?: string;
  sentiment_score?: number;
  is_anonymous: boolean;
  created_at: Date;
}

// Connection Types
export interface UserConnection {
  id: string;
  follower_id: string;
  following_id: string;
  status: 'connected' | 'pending' | 'blocked';
  connected_at: Date;
}

// Leaderboard Types
export interface LeaderboardEntry {
  id: string;
  game_session_id?: string;
  user_id: string;
  rank?: number;
  score: number;
  matches_count: number;
  average_match_score: number;
  leaderboard_type: string;
  period_start_date?: Date;
  created_at: Date;
}

// Analytics Types
export interface AnalyticsEvent {
  id: string;
  user_id?: string;
  event_type: string;
  room_id?: string;
  game_session_id?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

// API Request/Response Types
export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRegisterRequest {
  email: string;
  username: string;
  password: string;
  avatar?: string;
}

export interface AuthResponse {
  user: UserPublic;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
