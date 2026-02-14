import { query, transaction } from './connection';

/**
 * Create all database tables
 * Run this on app startup or during migrations
 */
export async function initializeDatabase(): Promise<void> {
  console.log('🚀 Initializing database schema...');

  await transaction(async (client) => {
    // 1. Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        avatar VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    // 2. Create user_profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        personality_traits JSONB DEFAULT '{}',
        communication_style VARCHAR(50),
        energy_level VARCHAR(50),
        response_speed VARCHAR(50),
        interests TEXT[],
        location VARCHAR(255),
        age INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_interests ON user_profiles USING GIN(interests);
    `);

    // 3. Create rooms table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        max_participants INT DEFAULT 8,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type);
      CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);
    `);

    // 4. Create game_sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL,
        current_round INT DEFAULT 0,
        game_state VARCHAR(50),
        participant_ids UUID[] NOT NULL,
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_room_id ON game_sessions(room_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON game_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON game_sessions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_participants ON game_sessions USING GIN(participant_ids);
    `);

    // 5. Create round_responses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS round_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        round_number INT NOT NULL,
        round_type VARCHAR(50),
        response_text TEXT,
        response_data JSONB,
        raw_score INT DEFAULT 0,
        sentiment_score FLOAT,
        empathy_score FLOAT,
        energy_level INT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(game_session_id, user_id, round_number)
      );

      CREATE INDEX IF NOT EXISTS idx_responses_session_id ON round_responses(game_session_id);
      CREATE INDEX IF NOT EXISTS idx_responses_user_id ON round_responses(user_id);
      CREATE INDEX IF NOT EXISTS idx_responses_round ON round_responses(round_number);
    `);

    // 6. Create matches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        connection_score INT,
        compatibility_breakdown JSONB,
        match_strength VARCHAR(50),
        match_tags TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(game_session_id, user1_id, user2_id)
      );

      CREATE INDEX IF NOT EXISTS idx_matches_session_id ON matches(game_session_id);
      CREATE INDEX IF NOT EXISTS idx_matches_user1_id ON matches(user1_id);
      CREATE INDEX IF NOT EXISTS idx_matches_user2_id ON matches(user2_id);
      CREATE INDEX IF NOT EXISTS idx_matches_score ON matches(connection_score DESC);
    `);

    // 7. Create connection_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS connection_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_match_count INT DEFAULT 1,
        average_score INT DEFAULT 0,
        last_matched_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user1_id, user2_id)
      );

      CREATE INDEX IF NOT EXISTS idx_connection_user1 ON connection_history(user1_id);
      CREATE INDEX IF NOT EXISTS idx_connection_user2 ON connection_history(user2_id);
    `);

    // 8. Create audience_votes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audience_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        voter_id UUID REFERENCES users(id) ON DELETE SET NULL,
        category VARCHAR(100) NOT NULL,
        nominee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vote_weight INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_votes_session_id ON audience_votes(game_session_id);
      CREATE INDEX IF NOT EXISTS idx_votes_nominee_id ON audience_votes(nominee_id);
      CREATE INDEX IF NOT EXISTS idx_votes_category ON audience_votes(category);
    `);

    // 9. Create meme_uploads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS meme_uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        meme_url VARCHAR(255) NOT NULL,
        caption TEXT NOT NULL,
        template_id VARCHAR(100),
        total_reactions INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_memes_session_id ON meme_uploads(game_session_id);
      CREATE INDEX IF NOT EXISTS idx_memes_user_id ON meme_uploads(user_id);
    `);

    // 10. Create meme_reactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS meme_reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        meme_id UUID NOT NULL REFERENCES meme_uploads(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reaction_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(meme_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_reactions_meme_id ON meme_reactions(meme_id);
      CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON meme_reactions(user_id);
    `);

    // 11. Create chat_messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_text TEXT NOT NULL,
        round_type VARCHAR(50),
        sentiment_score FLOAT,
        is_anonymous BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON chat_messages(game_session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON chat_messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON chat_messages(created_at);
    `);

    // 12. Create user_connections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'connected',
        connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      );

      CREATE INDEX IF NOT EXISTS idx_connections_follower ON user_connections(follower_id);
      CREATE INDEX IF NOT EXISTS idx_connections_following ON user_connections(following_id);
    `);

    // 13. Create leaderboards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rank INT,
        score INT NOT NULL,
        matches_count INT DEFAULT 0,
        average_match_score INT DEFAULT 0,
        leaderboard_type VARCHAR(50),
        period_start_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(game_session_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_leaderboards_session_id ON leaderboards(game_session_id);
      CREATE INDEX IF NOT EXISTS idx_leaderboards_user_id ON leaderboards(user_id);
      CREATE INDEX IF NOT EXISTS idx_leaderboards_score ON leaderboards(score DESC);
    `);

    // 14. Create analytics_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
        game_session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
    `);
  });

  console.log('✅ Database schema initialized successfully');
}

/**
 * Drop all tables (for testing/reset)
 */
export async function dropAllTables(): Promise<void> {
  await transaction(async (client) => {
    const tables = [
      'analytics_events',
      'leaderboards',
      'user_connections',
      'chat_messages',
      'meme_reactions',
      'meme_uploads',
      'audience_votes',
      'connection_history',
      'matches',
      'round_responses',
      'game_sessions',
      'rooms',
      'user_profiles',
      'users',
    ];

    for (const table of tables) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
  });

  console.log('✅ All tables dropped');
}

export default { initializeDatabase, dropAllTables };
